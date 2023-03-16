import {
  ActionPanel,
  Action,
  Image,
  Detail,
  getPreferenceValues,
  List,
  openExtensionPreferences,
  showToast,
  Toast,
} from "@raycast/api";
import fetch, { AbortError, RequestInit, Response } from "node-fetch";
import { useCallback, useEffect, useRef, useState } from "react";
import https = require("https");

// 获取全局变量
const prefs: {
  instance: string;
  unsafeHttps: boolean;
  schemaid: string;
  limit: number;
  token: string;
} = getPreferenceValues();
export const cmdbUrl = `https://${prefs.instance}`;

// 鉴权函数
const headers = {
  Accept: "application/json",
  Authorization: `Bearer ${prefs.token}`,
};

// 获取时间戳
function getNowMilliSecond() {
  return Math.floor(Date.now());
}

// 初始化配置
function renderPreferences() {
  const markdown = `Please set your preferences in the extension preferences.`;
  return (
    <Detail
      markdown={markdown}
      actions={
        <ActionPanel>
          <Action title="Open Extension Preferences" onAction={openExtensionPreferences} />
        </ActionPanel>
      }
    />
  );
}

// 查询关键字获取
export default function Command() {
  if (!prefs.token) {
    return renderPreferences();
  }
  const [results, isLoading, search] = useSearch();
  // const [_type, setType] = useState("page");
  const [searchText, setSearchText] = useState("");

  useEffect(() => {
    search(searchText);
  }, [searchText]);

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search by name..."
      onSearchTextChange={(searchText) => setSearchText(searchText)}
      throttle
    >
      <List.Section title="Results">
        {results.length > 0 &&
          results.map((searchResult) => (
            <SearchListItem key={searchResult.name} searchResult={searchResult} />
          ))}
      </List.Section>
    </List>
  );
}

function useSearch() {
  const [isLoading, setIsLoading] = useState(true);
  const [results, setResults] = useState<SearchResult[]>([]);
  const cancelRef = useRef<AbortController | null>(null);

  const search = useCallback(
    async function search(searchText: string) {
      cancelRef.current?.abort();
      cancelRef.current = new AbortController();
      setIsLoading(true);
      try {
        const response = await searchCMDB(searchText, cancelRef.current.signal);
        setResults(response);
      } catch (error) {
        if (error instanceof AbortError) {
          return;
        }
        showToast(Toast.Style.Failure, "Could not perform search", String(error));
      } finally {
        setIsLoading(false);
      }
    },
    [cancelRef, setIsLoading, setResults]
  );

  useEffect(() => {
    search("");
    return () => {
      cancelRef.current?.abort();
    };
  }, []);

  return [results, isLoading, search] as const;
}

async function searchCMDB(searchText: string, signal: AbortSignal) {
  const httpsAgent = new https.Agent({
    rejectUnauthorized: !prefs.unsafeHttps,
  });
  const init: RequestInit = {
    headers,
    method: "get",
    agent: httpsAgent,
  };

  // 查询关键字定义及转码
  let query = encodeURIComponent(`${searchText}`);

  // 查询结果调用
  const apiUrl = `${cmdbUrl}/rest/insight/1.0/object/search?schemaId=${prefs.schemaid}&limit=${prefs.limit}&query=${query}&page=1&_=${getNowMilliSecond()}`;
  return fetch(apiUrl, init).then((response: any) => {
    return parseResponse(response);
  });
}

// 查询结构处理
async function parseResponse(response: Response) {
  const jsonResults = ((await response.json()) as ResultsItem) ?? [];
  return jsonResults
  .filter((jsonResult: ResultsItem) => jsonResult)
  .map((jsonResult: ResultsItem) => {
    return {
      id: jsonResult.id as number,
      key: jsonResult.objectKey as string,
      name: jsonResult.name as string,
      type: jsonResult.objectType.name as string,
      typeId: jsonResult.objectType.id as number,
      url: jsonResult._links.self as string,
      icon: jsonResult.avatar.url48 as string,
    };
  });
}

// 查询结果呈现
function SearchListItem({ searchResult }: { searchResult: SearchResult }) {
  // console.log(`${searchResult.icon}`);
  return (
    <List.Item
      id={searchResult.key}
      title={searchResult.name}
      subtitle={searchResult.type}
      keywords={[searchResult.name, searchResult.key]}
      icon={{
            source: `${searchResult.icon}`,
            mask: Image.Mask.Circle,
          }}
      // accessories={[
      //   {
      //     text: { value: searchResult.author },
      //     icon: {
      //       source: `${searchResult.icon}`,
      //       mask: Image.Mask.Circle,
      //     },
      //   },
      // ]}
      // icon={{ source: "list-icon.png" }}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action.OpenInBrowser title="Open in Browser" url={searchResult.url} />
            <Action.CopyToClipboard
              title="Copy URL"
              content={searchResult.url}
              shortcut={{ modifiers: ["cmd"], key: "." }}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

interface SearchResult {
  id: number;
  name: string;
  type: string;
  key: string;
  url: string;
  icon: string;
  subTitle: string;
  mediaType: string;
}

interface ResultsItem {
  id: number;
  label: string;
  objectKey: string;
  avatar: Avatardata;
  objectType: Objectdata;
  created: string;
  updated: string;
  hasAvatar: boolean;
  timestamp: number;
  _links: Linksdata;
  name: string;
}

interface Linksdata {
  self: string;
}

interface Avatardata {
  url16: string;
  url48: string;
  url72: string;
  url144: string;
  url288: string;
  objectId: number;
}

interface Objectdata {
  id: number;
  name: string;
  type: number;
  icon: Icondata[];
  position: number;
  created: string;
  updated: string;
  objectCount: number;
  parentObjectTypeId: number;
  objectSchemaId: number;
  inherited: boolean;
  abstractObjectType: boolean;
  parentObjectTypeInherited: boolean;
}

interface Icondata {
  id: number;
  name: string;
  url16: string;
  url48: string;
}
