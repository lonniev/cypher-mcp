// Cloudflare Pages Function: /mcp → the cypher-mcp operator on Horizon.
import { makeMcpProxy } from "@tollbooth-dpyc/web/pages-proxy";

export const onRequest = makeMcpProxy("https://cypher-mcp.fastmcp.app/mcp");
