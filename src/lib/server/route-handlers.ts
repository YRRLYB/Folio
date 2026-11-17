import "server-only";

import { NextResponse } from "next/server";
import { apiError, createResource, deleteResource, getResource, guard, jsonBody, listResource, listRevisions, restoreRevision, updateResource, type Resource } from "@/lib/server/studio";

export async function collectionGet(request: Request, resource: Resource) {
  try {
    const denied = await guard(request);
    if (denied) return denied;
    return NextResponse.json(await listResource(resource));
  } catch (error) { return apiError(error); }
}

export async function collectionPost(request: Request, resource: Resource) {
  try {
    const denied = await guard(request);
    if (denied) return denied;
    return NextResponse.json(await createResource(resource, await jsonBody(request)), { status: 201 });
  } catch (error) { return apiError(error); }
}

export async function itemGet(request: Request, resource: Resource, id: string) {
  try {
    const denied = await guard(request);
    if (denied) return denied;
    const item = await getResource(resource, id);
    return item ? NextResponse.json(item) : NextResponse.json({ error: "Not found" }, { status: 404 });
  } catch (error) { return apiError(error); }
}

export async function itemPatch(request: Request, resource: Resource, id: string) {
  try {
    const denied = await guard(request);
    if (denied) return denied;
    const item = await updateResource(resource, id, await jsonBody(request), request.headers.get("X-Studio-Draft-Autosave") === "1");
    return item ? NextResponse.json(item) : NextResponse.json({ error: "Not found" }, { status: 404 });
  } catch (error) { return apiError(error); }
}

export async function itemDelete(request: Request, resource: Resource, id: string) {
  try {
    const denied = await guard(request);
    if (denied) return denied;
    return await deleteResource(resource, id) ? new Response(null, { status: 204 }) : NextResponse.json({ error: "Not found" }, { status: 404 });
  } catch (error) { return apiError(error); }
}

export async function revisionsGet(request: Request, resource: Resource, id: string) {
  try {
    const denied = await guard(request);
    if (denied) return denied;
    return NextResponse.json(await listRevisions(resource, id));
  } catch (error) { return apiError(error); }
}

export async function revisionRestore(request: Request, resource: Resource, id: string, revisionId: string) {
  try {
    const denied = await guard(request);
    if (denied) return denied;
    const item = await restoreRevision(resource, id, revisionId);
    return item ? NextResponse.json(item) : NextResponse.json({ error: "Not found" }, { status: 404 });
  } catch (error) { return apiError(error); }
}
