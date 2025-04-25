import { getCollection } from "astro:content";
import type { CollectionEntry } from "astro:content";

export async function getAllProjects() {
  const projects = await getCollection("project", ({ data }) => {
    return !data.draft;
  });
  return projects;
}

export function sortProjectsByDate(projects: CollectionEntry<"project">[]) {
  return projects.sort(
    (a, b) => b.data.pubDate.valueOf() - a.data.pubDate.valueOf()
  );
}

export function sortProjectsByOrder(projects: CollectionEntry<"project">[]) {
  return projects.sort((a, b) => {
    // If both have order, sort by order
    if (a.data.order && b.data.order) {
      return a.data.order - b.data.order;
    }
    // If only a has order, a comes first
    if (a.data.order) return -1;
    // If only b has order, b comes first
    if (b.data.order) return 1;
    // If neither has order, sort by date
    return b.data.pubDate.valueOf() - a.data.pubDate.valueOf();
  });
} 