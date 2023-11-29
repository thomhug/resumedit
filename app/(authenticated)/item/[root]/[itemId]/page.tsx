// @/app/(authenticated)/item/[root]/[itemId]/[action]/page.tsx

"use server";

import ItemDescendantList from "@/components/itemDescendant/ItemDescendantList.server";
import { Skeleton } from "@/components/ui/skeleton";
import { IdSchemaType, isValidItemId } from "@/schemas/id";
import { ItemDescendantModelNameType } from "@/types/itemDescendant";
import { notFound } from "next/navigation";
import { Suspense } from "react";

export interface ItemDescendantActionPageProps {
  params: { root: ItemDescendantModelNameType; id: IdSchemaType };
}

export default async function ItemDescendantActionPage({ params: { root, id } }: ItemDescendantActionPageProps) {
  const itemModel = root;
  const resumeAction = "view";

  const validId = isValidItemId(id);
  return !id || !validId ? (
    notFound()
  ) : (
    <Suspense fallback={<ItemDescendantActionSkeleton />}>
      <ItemDescendantList itemModel={itemModel} itemId={id} resumeAction={resumeAction} />
    </Suspense>
  );
}

function ItemDescendantActionSkeleton() {
  return <Skeleton className="border-2 border-primary-/20 h-48 w-full shadow-lg" />;
}