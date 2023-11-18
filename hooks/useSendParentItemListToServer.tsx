import { getListLastModifiedById, handleParentItemListFromClient } from "@/actions/parentItemList";
import { toast } from "@/components/ui/use-toast";
import { useParentItemListStore } from "@/contexts/ParentItemListStoreContext";
import { useStoreName } from "@/contexts/StoreNameContext";
import { dateToISOLocal } from "@/lib/utils/formatDate";
import { ItemClientToServerType } from "@/types/item";
import { ParentItemListStoreNameType, ParentItemListType } from "@/types/parentItemList";
import { useCallback, useEffect } from "react";

export function useSendParentItemLisToServer() {
  const storeName = useStoreName();
  const store = useParentItemListStore(storeName);
  const synchronizationInterval = store((state) => state.synchronizationInterval);

  const parentId = store((state) => state.parentId);
  const lastModified = store((state) => state.lastModified);
  const items = store((state) => state.items);
  const updateStoreWithServerData = store((state) => state.updateStoreWithServerData);

  const syncItems = useCallback(async () => {
    // Send the entire item list
    const clientList = { parentId, lastModified, items } as ParentItemListType<ItemClientToServerType>;
    if (clientList.parentId) {
      const clientModified = clientList.lastModified;
      const updatedItemList = await handleParentItemListFromClient(
        storeName as ParentItemListStoreNameType,
        clientList,
      );

      if (updatedItemList) {
        updateStoreWithServerData(updatedItemList);
        const serverModified = await getListLastModifiedById(storeName, clientList.parentId);

        if (serverModified > clientModified) {
          toast({
            title: `Synchronized`,
            description: `Local: ${dateToISOLocal(new Date(clientModified))}: ${
              clientList.items.length
            }\nServer: ${dateToISOLocal(new Date(updatedItemList.lastModified))}: ${updatedItemList.items.length}`,
          });
        }
      }
    }
  }, []);

  useEffect(() => {
    if (synchronizationInterval > 0) {
      const intervalId = setInterval(syncItems, synchronizationInterval * 1000);
      return () => clearInterval(intervalId); // Cleanup on unmount
    }
  }, [syncItems, synchronizationInterval]);
}
