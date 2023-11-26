// @/stores/nestedItem/createNestedItemStore.ts
import { IdSchemaType, getItemId } from "@/schemas/id";
import {
  ClientIdType,
  NestedItemDescendantClientStateType,
  NestedItemDescendantDataType,
  NestedItemDescendantDataUntypedType,
  NestedItemDisposition,
  NestedItemListType,
  NestedItemModelAccessor,
  NestedItemOrderableChildClientStateType,
  NestedItemServerToClientType,
  // createTypesafeLocalstorage,
  getDescendantModel,
  getParentModel,
} from "@/types/nestedItem";
import { Draft } from "immer";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";
import { reBalanceListOrderValues, updateListOrderValues } from "./utils/descendantOrderValues";
import { logUpdateStoreWithServerData } from "./utils/logNestedItemStore";
import { handleNestedItemListFromServer } from "./utils/syncNestedItem";

export type NestedItemStoreDescendantType<
  I extends NestedItemDescendantClientStateType,
  C extends NestedItemDescendantClientStateType,
> = C | NestedItemStore<I, C>;

export type NestedItemStoreDescendantListType<
  I extends NestedItemDescendantClientStateType,
  C extends NestedItemDescendantClientStateType,
> = Array<NestedItemStoreDescendantType<I, C>>;

export type NestedItemState<
  I extends NestedItemDescendantClientStateType,
  C extends NestedItemDescendantClientStateType,
> = {
  clientId: IdSchemaType;
  id: IdSchemaType | undefined;
  parentId: IdSchemaType | undefined;
  createdAt: Date;
  lastModified: Date;
  deletedAt: Date | null;
  disposition: NestedItemDisposition;

  parentModel: keyof NestedItemModelAccessor | null;
  itemModel: keyof NestedItemModelAccessor;
  descendantModel: keyof NestedItemModelAccessor | null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  descendants: NestedItemStoreDescendantListType<I, C>;
  descendantDraft: NestedItemDescendantDataType<C>;
};

export type NestedItemActions<C extends NestedItemDescendantClientStateType> = {
  setData: (data: NestedItemDescendantDataUntypedType) => void;
  setDescendantData: (clientId: ClientIdType, data: NestedItemDescendantDataUntypedType) => void;
  addDescendant: (itemData: NestedItemDescendantDataType<C>) => ClientIdType;
  markDescendantAsDeleted: (clientId: ClientIdType) => void;
  reArrangeDescendants: (reArrangedItems: NestedItemOrderableChildClientStateType[]) => void;
  resetDescendantsOrderValues: () => void;
  updateDescendantDraft: (itemData: NestedItemDescendantDataUntypedType) => void;
  commitDescendantDraft: () => void;
  updateStoreWithServerData: (
    serverState: NestedItemListType<NestedItemServerToClientType, NestedItemServerToClientType>,
  ) => void;
};

export type NestedItemStore<
  I extends NestedItemDescendantClientStateType,
  C extends NestedItemDescendantClientStateType,
> = NestedItemState<I, C> & NestedItemActions<C>;

// Selector type is used to type the return type when using the store with a selector
type NestedItemSelectorType<
  I extends NestedItemDescendantClientStateType,
  C extends NestedItemDescendantClientStateType,
  T,
> = (state: NestedItemStore<I, C>) => T;

// Hook type is used as a return type when using the store
export type NestedItemHookType = <
  I extends NestedItemDescendantClientStateType,
  C extends NestedItemDescendantClientStateType,
  T,
>(
  selector?: NestedItemSelectorType<I, C, T>,
) => T;

export interface NestedStoreConfigType {
  itemModel: keyof NestedItemModelAccessor;
  clientId: IdSchemaType;
  id: IdSchemaType | undefined;
  parentId: IdSchemaType | undefined;
  storeVersion?: number;
  storeName?: string;
  logUpdateFromServer?: boolean;
}
export const storeVersion = 1;
export const storeNameSuffix = "nested-item.devel.resumedit.local";

export const createNestedItemStore = <
  I extends NestedItemDescendantClientStateType,
  C extends NestedItemDescendantClientStateType,
>(
  props: NestedStoreConfigType,
) => {
  const parentId = props.parentId;
  const id = props.id;
  const clientId = props.clientId;
  const itemModel = props.itemModel;
  // Retrieve the parent model
  const descendantModel = getParentModel(props.itemModel);
  const storeName = `${itemModel}-${storeNameSuffix}`;

  return create(
    persist(
      immer<NestedItemStore<I, C>>((set, get) => ({
        parentId,
        id,
        clientId,
        createdAt: new Date(),
        lastModified: new Date(),
        deletedAt: null,
        disposition: NestedItemDisposition.New,

        parentModel: getParentModel(itemModel),
        itemModel: itemModel,
        descendantModel: descendantModel,
        descendants: [],
        descendantDraft: {} as C,

        setData: (itemData: NestedItemDescendantDataUntypedType): void => {
          set((state) => {
            // Loop through each key in itemData and update the state
            Object.keys(itemData).forEach((key) => {
              if (key in state) {
                // @ts-expect-error: Next line is necessary for dynamic key access
                state[key] = itemData[key];
              }
            });
            state.disposition = NestedItemDisposition.Modified;
            state.lastModified = new Date();
          });
        },
        setDescendantData: (clientId: ClientIdType, itemData: NestedItemDescendantDataUntypedType): void => {
          // Update the state with the new content for the specified item
          set((state) => {
            state.descendants = state.descendants.map((item) => {
              if (item.clientId === clientId) {
                return { ...item, ...itemData, disposition: NestedItemDisposition.Modified, lastModified: new Date() };
              }
              return item;
            });
            // Update the modification timestamp
            state.lastModified = new Date();
          });
        },
        addDescendant: (itemData: NestedItemDescendantDataType<C>) => {
          const descendantClientId = getItemId();
          const descendantModel = getDescendantModel(itemModel);
          set((state) => {
            let newItem;
            if (descendantModel) {
              // Create the nested store of type C
              const descendantStoreProps: NestedStoreConfigType = {
                parentId: id,
                id: undefined,
                clientId: descendantClientId,
                itemModel: descendantModel,
              };
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const descendantStore = createNestedItemStore<C, any>(descendantStoreProps);
              newItem = descendantStore as unknown as Draft<NestedItemStore<I, C>>;
            } else {
              // Leaf of the hierarchy
              // Add the extra fields for type `NestedItemClientType`
              newItem = {
                clientId: descendantClientId,
                createdAt: new Date(),
                lastModified: new Date(),
                disposition: NestedItemDisposition.New,
                ...itemData,
              } as Draft<C>;
            }
            state.descendants = state.descendants.length ? [...state.descendants, newItem] : ([newItem] as Draft<C>[]);
          });
          return clientId;
        },
        markDescendantAsDeleted: (clientId: ClientIdType): void => {
          // Update the state with the deletedAt timestamp for the specified item
          set((state) => {
            state.descendants = state.descendants.map((item) => {
              if (item.clientId === clientId) {
                return { ...item, disposition: NestedItemDisposition.Modified, deletedAt: new Date() };
              }
              return item;
            });
            // Update the modification timestamp
            state.lastModified = new Date();
          });
        },
        reArrangeDescendants: (reArrangedItems: NestedItemOrderableChildClientStateType[]): void => {
          set((state) => {
            state.descendants = updateListOrderValues(reArrangedItems) as unknown as Array<C> as Draft<C>[];
            // Update the modification timestamp
            state.lastModified = new Date();
          });
        },
        resetDescendantsOrderValues: (): void => {
          set((state) => {
            state.descendants = reBalanceListOrderValues(
              state.descendants as unknown as NestedItemOrderableChildClientStateType[],
              true,
            ) as unknown as Draft<C>[];
            // Update the modification timestamp
            state.lastModified = new Date();
          });
        },
        updateDescendantDraft: (itemData: NestedItemDescendantDataUntypedType) =>
          set((state) => {
            state.descendantDraft = {
              ...(state.descendantDraft as NestedItemDescendantDataType<C>),
              ...(itemData as NestedItemDescendantDataType<C>),
            } as Draft<NestedItemDescendantDataType<C>>;
            // Update the modification timestamp
            state.lastModified = new Date();
          }),
        commitDescendantDraft: () => {
          // Generate a new clientId
          const clientId = getItemId();

          set((state) => {
            // Create a copy of the draft
            const itemData = {
              ...(state.descendantDraft as NestedItemDescendantDataType<C>),
            } as NestedItemDescendantDataType<C>;

            // Construct the new item
            const newItem = {
              clientId,
              createdAt: new Date(),
              lastModified: new Date(),
              disposition: NestedItemDisposition.New,
              ...itemData,
            } as unknown as Draft<C>;

            // Append it to the end of the store's `descendants` array
            state.descendants = state.descendants.length ? [...state.descendants, newItem] : ([newItem] as Draft<C>[]);

            // Update the modification timestamp
            state.lastModified = new Date();

            // Reset the draft
            state.descendantDraft = {} as Draft<NestedItemDescendantDataType<C>>;
          });
        },
        updateStoreWithServerData: (
          serverState: NestedItemListType<NestedItemServerToClientType, NestedItemServerToClientType>,
        ) => {
          if (props.logUpdateFromServer) {
            logUpdateStoreWithServerData(
              get() as NestedItemStore<NestedItemDescendantClientStateType, NestedItemDescendantClientStateType>,
              serverState,
            );
          }
          set((state) => {
            const updatedState = handleNestedItemListFromServer(state, serverState);
            if (updatedState === null) {
              console.log(`No updated`);
            }
          });
        },
      })),
      { name: storeName, version: storeVersion /*, storage: createTypesafeLocalstorage<I, C>()*/ },
    ),
  );
};