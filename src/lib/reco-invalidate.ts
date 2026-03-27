import { revalidateTag } from "next/cache";

export const recoUserTag = (userId: string) => `reco-user-${userId}`;

export function invalidateUserRecommendations(userId: string) {
  revalidateTag(recoUserTag(userId), {});
}
