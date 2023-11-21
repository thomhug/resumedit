// @/components/item/ParentItemList.tsx

import { useParentItemListStore } from "@/contexts/ParentItemListStoreContext";
import { useStoreName } from "@/contexts/StoreNameContext";
import { findItemIndexByClientId } from "@/stores/parentItemList/utills/itemOrderValues";
import { ItemClientStateType, OrderableItemClientStateType } from "@/types/item";
import {
  DndContext,
  DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { restrictToParentElement } from "@dnd-kit/modifiers";
import { arrayMove, sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { useState } from "react";
import ParentItemListItem from "./ParentItemListItem";
import ParentItemListItemInput from "./ParentItemListItemInput";
import ParentItemSortableWrapper from "./utils/ParentItemSortableWrapper";
import useSettingsStore from "@/stores/settings/useSettingsStore";
import { useResumeAction } from "@/contexts/ResumeActionContext";

const ParentItemList = () => {
  const resumeAction = useResumeAction();
  const [editingInput, setEditingInput] = useState(resumeAction === "edit");
  const storeName = useStoreName();
  const store = useParentItemListStore(storeName);
  const items = store((state) => state.items);
  const deleteItemsByDisposition = store((state) => state.deleteItemsByDisposition);
  const setItemDeleted = store((state) => state.setItemDeleted);
  const reArrangeItemList = store((state) => state.reArrangeItemList);
  const resetItemListOrderValues = store((state) => state.resetItemListOrderValues);

  const settingsStore = useSettingsStore();
  const { showParentItemListInternals } = settingsStore;
  const showListItemInternals = process.env.NODE_ENV === "development" && showParentItemListInternals;

  const itemsAreDragable = storeName === "achievement" ? true : false;

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (active.id !== over!.id) {
      const activeIndex = findItemIndexByClientId(items, active.id as string);
      const overIndex = findItemIndexByClientId(items, over!.id as string);

      // Create a new array with updated 'moved' properties
      const updatedItems = items.map((item, index) => {
        if (index === activeIndex || index === overIndex) {
          return { ...item, moved: true };
        }
        return item;
      });

      // Update the state with the new array
      reArrangeItemList(arrayMove(updatedItems as OrderableItemClientStateType[], activeIndex, overIndex));
    }
  };

  return !items || !deleteItemsByDisposition ? null : (
    <div
      className="bg-elem-light dark:bg-elem-dark-1 mt-5 mb-5 rounded-md shadow-2xl shadow-shadow-light
     dark:shadow-black overflow-hidden"
    >
      {(resumeAction === "edit" && showListItemInternals) ?? (
        <>
          <button
            className="px-1 border-2 text-primary rounded-md"
            name="resetItemListOrderValues"
            role="button"
            onClick={() => {
              resetItemListOrderValues();
            }}
          >
            Reset order
          </button>
          <div className="m-3 space-x-2">
            <button
              className="px-1 border-2 text-destructive rounded-md"
              name="deleteItemsByDisposition"
              role="button"
              onClick={() => {
                deleteItemsByDisposition();
              }}
            >
              Remove deleted
            </button>
          </div>
        </>
      )}
      {
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          modifiers={[restrictToParentElement]}
          onDragEnd={handleDragEnd}
        >
          <ul className="flex flex-col bg-elem-light dark:bg-elem-dark-1 overflow-auto">
            <ParentItemSortableWrapper items={items} disabled={!itemsAreDragable}>
              {resumeAction === "edit" ? (
                <ParentItemListItemInput editingInput={editingInput} setEditingInput={setEditingInput} />
              ) : null}
              {items.map((item, index) => {
                return (
                  <ParentItemListItem
                    key={item.clientId}
                    index={index}
                    storeName={storeName}
                    resumeAction={resumeAction}
                    itemsAreDragable={itemsAreDragable}
                    item={item as ItemClientStateType}
                    setItemDeleted={setItemDeleted}
                  />
                );
              })}
            </ParentItemSortableWrapper>
          </ul>
        </DndContext>
      }
    </div>
  );
};

export default ParentItemList;
