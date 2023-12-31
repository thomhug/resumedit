// @/components/itemDescendant/ItemDescendant.client.tsx

"use client";

import { ItemDescendantStoreProvider, useItemDescendantStore } from "@/contexts/ItemDescendantStoreContext";
import { ResumeActionProvider } from "@/contexts/ResumeActionContext";
import { StoreNameProvider, useStoreName } from "@/contexts/StoreNameContext";
import { IdSchemaType, getItemId, idRegex } from "@/schemas/id";
import {
  ItemDescendantClientStateType,
  ItemDescendantServerStateType,
} from "@/stores/itemDescendantStore/createItemDescendantStore";
import useSettingsStore from "@/stores/settings/useSettingsStore";
import { ItemClientStateType, ItemDataType, ItemDataUntypedType, ItemServerToClientType } from "@/types/item";
import {
  ItemDescendantModelNameType,
  getDescendantModel,
  getParentModel,
  itemDescendantModelHierarchy,
} from "@/types/itemDescendant";
import { ResumeActionType, resumeActionButtonIcons, resumeActionTypes } from "@/types/resume";
import Link from "next/link";
import { Dispatch, ReactNode, SetStateAction, useEffect, useState } from "react";
import { Button } from "../ui/button";
import Item from "./Item";
import RestoreItemDialog from "./RestoreItemDialog";
import Descendant from "./descendant/Descendant";
import DescendantInput from "./descendant/DescendantInput";
import DescendantList from "./descendant/DescendantList";
import { ItemDescendantListSynchronization } from "./utils/ItemDescendantListSynchronization";

export function getActionURL(
  pathname: string,
  item: ItemDescendantClientStateType<ItemClientStateType, ItemClientStateType>,
  action: ResumeActionType = "edit",
) {
  // Regex pattern that combines item model and ID patterns
  const itemModelRE = new RegExp(itemDescendantModelHierarchy.join("|"));
  const idUnanchoredRE = new RegExp(idRegex.substring(1, idRegex.length - 1));
  const resumeActionRE = new RegExp(resumeActionTypes.join("|"));
  const combinedRE = new RegExp(`(${itemModelRE.source}|${idUnanchoredRE.source}|${resumeActionRE.source})*/*`, "g");

  // Replace segments in the pathname that match either of the regexes
  const baseURL = pathname.replace(combinedRE, "");

  // Construct and return the new URL
  return `/${baseURL}/${item.itemModel}/${item.id}/${action}`;
}

export interface ItemActionButtonProps {
  pathname: string;
  item: ItemDescendantClientStateType<ItemClientStateType, ItemClientStateType>;
  action?: ResumeActionType;
}
export function ItemActionButton(props: ItemActionButtonProps) {
  const { pathname, item, action = "view" } = props;
  const actionURL = getActionURL(pathname, item, action);
  const actionButtonInner = resumeActionButtonIcons[action];

  return actionURL.match(/\/(item)/) ? (
    <Link href={actionURL}>
      <Button variant="ghost">{actionButtonInner}</Button>
    </Link>
  ) : null;
}

export interface ItemDescendantRenderProps {
  index: number;
  id: string;
  item: ItemDescendantClientStateType<ItemClientStateType, ItemClientStateType>;
  itemModel: ItemDescendantModelNameType;
  rootItemModel: ItemDescendantModelNameType;
  leafItemModel: ItemDescendantModelNameType;
  resumeAction: ResumeActionType;
  editingInput: boolean;
  setEditingInput: Dispatch<SetStateAction<boolean>>;
  setDescendantData: (data: ItemDataUntypedType, clientId: string) => void;
  markDescendantAsDeleted: (clientId: IdSchemaType) => void;
  descendantDraft: ItemDataType<ItemClientStateType>;
  updateDescendantDraft: (descendantData: ItemDataUntypedType) => void;
  commitDescendantDraft: () => void;
  showIdentifiers: boolean;
  showSynchronization: boolean;
}
function ItemDescendantListRender(props: ItemDescendantRenderProps): ReactNode {
  const { item, rootItemModel, leafItemModel, editingInput } = props;
  const { itemModel, descendantModel, descendants } = item;

  const atRootLevel = itemModel === rootItemModel;
  if (!descendantModel) return;

  const descendantDescendantModel = getDescendantModel(descendantModel);

  return (
    <>
      {item.deletedAt ? <RestoreItemDialog {...props} /> : null}
      {atRootLevel && editingInput ? <ItemDescendantListSynchronization /> : null}
      {atRootLevel ? <Item {...props} /> : <Descendant {...props} />}
      {item.descendantModel === leafItemModel ? (
        <DescendantList {...{ ...props, itemModel: descendantModel }} />
      ) : descendants?.filter((descendant) => !descendant.deletedAt)?.length > 0 ? (
        <ul key={item.clientId}>
          {descendants
            ?.filter((descendant) => !descendant.deletedAt)
            .map((descendant, descendantIndex) => (
              <li key={descendant.clientId}>
                <ItemDescendantListRender
                  {...props}
                  index={descendantIndex}
                  item={descendant}
                  itemModel={descendantModel}
                />
                {!editingInput || item.descendantModel === leafItemModel || !descendantDescendantModel ? null : (
                  <DescendantInput {...{ ...props, itemModel: descendantDescendantModel }} />
                )}
              </li>
            ))}
        </ul>
      ) : null}
    </>
  );
}

interface ItemDescendantListStateProps extends ItemDescendantListContextProps {}
function ItemDescendantListState(props: ItemDescendantListStateProps) {
  const [isStoreInitialized, setStoreInitialized] = useState(false);

  const globalStoreName = useStoreName();
  const store = useItemDescendantStore(globalStoreName);
  const rootState = store((state) => state);
  const updateStoreWithServerData = store((state) => state.updateStoreWithServerData);
  const [editingInput, setEditingInput] = useState(props.resumeAction === "edit");
  const setDescendantData = store((state) => state.setDescendantData);
  const markDescendantAsDeleted = store((state) => state.markDescendantAsDeleted);

  const descendantDraft = store((state) => state.descendantDraft);
  const updateDescendantDraft = store((state) => state.updateDescendantDraft);
  const commitDescendantDraft = store((state) => state.commitDescendantDraft);

  const settingsStore = useSettingsStore();
  const { showItemDescendantIdentifiers, showItemDescendantSynchronization } = settingsStore;
  const showIdentifiers = process.env.NODE_ENV === "development" && showItemDescendantIdentifiers;
  const showSynchronization = process.env.NODE_ENV === "development" && showItemDescendantSynchronization;

  const { serverState } = props;

  const clientProps = {
    ...props,
    index: 0,
    item: rootState,
    itemModel: props.rootItemModel,
    editingInput,
    setEditingInput,
    setDescendantData,
    markDescendantAsDeleted,
    descendantDraft,
    updateDescendantDraft,
    commitDescendantDraft,
    showIdentifiers,
    showSynchronization,
  };

  // console.log(
  //   `ItemDescendantClientContext: ${JSON.stringify(
  //     rootState.descendants.filter((descendant) => !descendant.deletedAt),
  //     undefined,
  //     2,
  //   )}`,
  // );
  useEffect(() => {
    if (updateStoreWithServerData && !isStoreInitialized) {
      console.log(`ItemDescendantClientContext: useEffect with serverState:`, serverState);
      updateStoreWithServerData(serverState);
      setStoreInitialized(true);
    }
  }, [serverState, isStoreInitialized, updateStoreWithServerData]);

  return !isStoreInitialized ? null : <ItemDescendantListRender {...clientProps} id={clientProps.item.clientId} />;
}

export interface ItemDescendantListContextProps {
  serverState: ItemDescendantServerStateType<ItemServerToClientType, ItemServerToClientType>;
  rootItemModel: ItemDescendantModelNameType;
  leafItemModel: ItemDescendantModelNameType;
  resumeAction: ResumeActionType;
}

export default function ItemDescendantListContext(props: ItemDescendantListContextProps) {
  const { serverState, resumeAction } = props;

  const itemModel = serverState.itemModel;
  const parentClientId = getItemId(getParentModel(itemModel));
  const clientId = getItemId(itemModel!);
  const parentId = serverState.parentId;
  const id = serverState.id;
  const storeVersion = 1; // Or any logic to determine the version
  const logUpdateFromServer = process.env.NODE_ENV === "development";

  return (
    <ResumeActionProvider resumeAction={resumeAction}>
      <StoreNameProvider storeName={`${itemModel}`}>
        <ItemDescendantStoreProvider
          configs={[{ itemModel, parentClientId, clientId, parentId, id, storeVersion, logUpdateFromServer }]}
        >
          <ItemDescendantListState {...props} />
        </ItemDescendantStoreProvider>
      </StoreNameProvider>
    </ResumeActionProvider>
  );
}
