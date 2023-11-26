// @/components/nestedItemRecursive/NestedItemRecursiveScaffold.server.tsx

"use server";

import { getItemsByParentId, getNestedItemList } from "@/actions/nestedItem";
import { getCurrentUserIdOrNull } from "@/actions/user";
import { IdSchemaType } from "@/schemas/id";
import {
  NestedItemListType,
  NestedItemModelAccessor,
  NestedItemServerStateType,
  getDescendantModel,
  nestedItemModelHierarchy,
} from "@/types/nestedItem";
import { ResumeActionType } from "@/types/resume";
import NestedItemRecursiveScaffoldClientComponent from "./NestedItemRecursiveScaffold.client";

export interface NestedItemRecursiveScaffoldServerComponentProps {
  storeName: keyof NestedItemModelAccessor;
  parentId: IdSchemaType;
  id?: IdSchemaType;
  resumeAction?: ResumeActionType;
}

export default async function NestedItemRecursiveScaffoldServerComponent({
  storeName,
  id,
  resumeAction,
}: NestedItemRecursiveScaffoldServerComponentProps) {
  // Check if this is a valid `storeName`
  const validStoreName = storeName?.length > 0 && nestedItemModelHierarchy.indexOf(storeName) > 0;
  if (!validStoreName) {
    return (
      <div>
        <h2>
          NestedItemRecursiveScaffoldServerComponent(<code>storeName=&quot;{storeName}&quot;</code>)
        </h2>
        <p>
          Store name <code>&quot;{storeName}&quot;</code> is invalid.
        </p>
        <p>Valid store names: {nestedItemModelHierarchy.slice(1).join(`, `)}</p>
      </div>
    );
  }

  let derivedItemId: string | null = id || null;
  let serverState;

  derivedItemId = await getCurrentUserIdOrNull();
  if (!derivedItemId) {
    throw Error(
      `NestedItemRecursiveScaffoldServerComponent: Cannot render storeName=${storeName}: current user not found`,
    );
  }

  // Start with a list of resumes owned by the current user
  let itemStoreName: string | null = nestedItemModelHierarchy[0];
  if (itemStoreName !== "user") {
    throw Error(
      `NestedItemRecursiveScaffoldServerComponent: invalid initial itemStoreName="${itemStoreName}"; should be "user"`,
    );
  }

  while (derivedItemId !== null) {
    if ((itemStoreName = getDescendantModel(itemStoreName)) === null) {
      throw Error(`Invalid storeName=${storeName}`);
    }
    const itemList: Array<NestedItemServerStateType> = await getItemsByParentId(itemStoreName, derivedItemId);
    if (itemList?.length > 0) {
      derivedItemId = itemList[0].id;
      if (itemStoreName === storeName) {
        break;
      }
    } else {
      return (
        <div>
          <h2>
            NestedItemRecursiveScaffoldServerComponent(<code>storeName=&quot;{storeName}&quot;</code>)
          </h2>
          <p>
            Store <code>{itemStoreName}</code> does not contain any items with id <code>{derivedItemId}</code>
          </p>
        </div>
      );
    }
  }

  if (itemStoreName && derivedItemId) {
    const serverItems = await getNestedItemList(itemStoreName, derivedItemId);
    serverState = {
      ...serverItems,
    } as NestedItemListType<NestedItemServerStateType, NestedItemServerStateType>;

    console.log(`NestedItem.server: serverState:`, serverState);
  } else {
    throw Error(`No entries for parent of storeName=${itemStoreName} found`);
  }

  return !serverState ? null : (
    <div className="space-y-8">
      <NestedItemRecursiveScaffoldClientComponent
        storeName={itemStoreName}
        serverState={serverState}
        resumeAction={resumeAction}
      />
    </div>
  );
}
