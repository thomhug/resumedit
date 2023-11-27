// @/app/(authenticated)/itemDescendant/[root]/page.tsx

"use server";

import { getCurrentUserIdOrNull } from "@/actions/user";
import ItemDescendantServerComponent from "@/components/itemDescendant/ItemDescendant.server";
import { Skeleton } from "@/components/ui/skeleton";
import { Suspense } from "react";

export default async function ItemDescendantPage() {
  const root = "resume";
  const userId = await getCurrentUserIdOrNull();
  return !userId ? null : (
    <Suspense fallback={<ItemDescendantSkeleton />}>
      <ItemDescendantServerComponent rootItemModel={root} parentId={userId} />
    </Suspense>
  );
}

function ItemDescendantSkeleton() {
  return <Skeleton className="border-2 border-primary-/20 h-48 w-full shadow-lg" />;
}
