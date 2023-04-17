import { getPreferenceValues } from "@raycast/api";
import fetch, { FetchError, Response } from "node-fetch";
import { ErrorText, PresentableError } from "./exception";
import * as https from "https";

// 获取全局变量
const prefs: { instance: string; unsafeHttps: boolean; schemaid: string; limit: number; token: string; blj: string; } = getPreferenceValues();
export const cmdbUrl = `https://${prefs.domain}`;

// 鉴权头传递
const headers = {
  Accept: "application/json",
  Authorization: `Bearer ${prefs.token}`,
};
const agent = new https.Agent({ rejectUnauthorized: !prefs.unsafeHttps });
const init = {
  headers,
  agent,
};

// 获取时间戳
function getNowMilliSecond() {
  return Math.floor(Date.now());
}

type QueryParams = { [key: string]: string };
type StatusErrors = { [key: number]: ErrorText };

/**
 * Fetches a JSON object of type `Result` or throws an exception if the request fails or returns a non-okay status code.
 * @param searchText 查询关键字
 * @param statusErrors define custom error texts for response status codes to be thrown
 * @throws if the response's status code is not okay
 * @return the jira response
 */
export async function listFetchObject<Result>(
  searchText: string,
  statusErrors?: StatusErrors
): Promise<Result> {

  // 查询关键字定义及转码
  let query = encodeURIComponent(`${searchText}`);

  // 查询结果调用
  const url = `/rest/insight/1.0/object/search?schemaId=${prefs.schemaid}&limit=${prefs.limit}&query=${query}&page=1&_=${getNowMilliSecond()}`;
  const response = await cmdbFetch(url, statusErrors);
  return (await response.json()) as unknown as Result;
}

/**
 * Fetches a response from Jira or throws an exception if the request fails or returns a non-okay status code.
 * @param url 接口调用地址
 * @param statusErrors define custom error texts for response status codes to be thrown
 * @throws if the response's status code is not okay
 * @return the jira response
 */
export async function cmdbFetch(
  // path: string,
  url: string,
  statusErrors?: StatusErrors
): Promise<Response> {
  // const paramKeys = Object.keys(params);
  // const query = paramKeys.map((key) => `${key}=${encodeURI(params[key])}`).join("&");
  try {
    // const sanitizedPath = path.startsWith("/") ? path.substring(1) : path;
    // const url = `${cmdbUrl}/${sanitizedPath}` + (query.length > 0 ? `?${query}` : "");
    const response = await fetch(`${cmdbUrl}/${url}`, init);
    throwIfResponseNotOkay(response, statusErrors);
    return response;
  } catch (error) {
    if (error instanceof FetchError) throw Error("检查你的网路链接.");
    else throw error;
  }
}

const defaultStatusErrors: StatusErrors = {
  401: ErrorText("ITSM&CMDB 鉴权失败", "请登录 https://itsm.cvte.com/secure/ViewProfile.jspa 重新获取个人访问令牌并配置到插件中."),
};

function throwIfResponseNotOkay(response: Response, statusErrors?: StatusErrors) {
  if (!response.ok) {
    const status = response.status;
    const definedStatus = statusErrors ? { ...defaultStatusErrors, ...statusErrors } : defaultStatusErrors;
    const exactStatusError = definedStatus[status];
    if (exactStatusError) throw new PresentableError(exactStatusError.name, exactStatusError.message);
    else if (status >= 500) throw new PresentableError("CMDB Error", `Server error ${status}`);
    else throw new PresentableError("CMDB Error", `Request error ${status}`);
  }
}
