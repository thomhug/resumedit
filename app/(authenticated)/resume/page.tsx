// @/app/(authenticated)/itemDescendant/[root]/page.tsx

"use server";

import { getCurrentUserIdOrNull } from "@/actions/user";
import ItemDescendantServerComponent from "@/components/itemDescendant/ItemDescendant.server";
import { Skeleton } from "@/components/ui/skeleton";
import { isValidItemId } from "@/schemas/id";
import { notFound } from "next/navigation";
import { Suspense } from "react";

export default async function ItemDescendantPage() {
  const itemModel = "user";
  const resumeAction = "edit";
  const userId = await getCurrentUserIdOrNull();
  const id = userId;
  const validId = isValidItemId(id);
  return !id || !validId ? (
    notFound()
  ) : (
    <Suspense fallback={<ItemDescendantSkeleton />}>
      <ItemDescendantServerComponent itemModel={itemModel} itemId={id} resumeAction={resumeAction} />
    </Suspense>
  );
}

function ItemDescendantSkeleton() {
  return <Skeleton className="border-2 border-primary-/20 h-48 w-full shadow-lg" />;
}
