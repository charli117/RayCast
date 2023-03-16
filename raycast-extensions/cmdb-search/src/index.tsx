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

const prefs: {
  instance: string;
  unsafeHttps: boolean;
  schemaid: string;
  limit: number;
  token: string;
} = getPreferenceValues();
export const cmdbUrl = `https://${prefs.instance}`;
export const schemaId = `https://${prefs.schemaid}`;
export const limit = `https://${prefs.limit}`;
export const timestamp = `https://${prefs.limit}`;

const headers = {
  Accept: "application/json",
  Authorization: `Bearer ${prefs.token}`,
};

function renderPreferences() {
  const markdown = `Please set your preferences in the extension preferences.`;

  return (
    <Detail
      markdown={markdown}
      actions={
        <ActionPanel>
          <Action
            title="Open Extension Preferences"
            onAction={openExtensionPreferences}
          />
        </ActionPanel>
      }
    />
  );
}

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
      searchBarPlaceholder="Search by keywords..."
      onSearchTextChange={(searchText) => setSearchText(searchText)}
      searchBarAccessory={renderFilter(setType)}
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
        const response = await searchCMDB(
          searchText,
          cancelRef.current.signal
        );
        setResults(response);
      } catch (error) {
        if (error instanceof AbortError) {
          return;
        }
        showToast(
          Toast.Style.Failure,
          "Could not perform search",
          String(error)
        );
      } finally {
        setIsLoading(false);
      }
    },
    [cancelRef, setIsLoading, setResults]
  );

  useEffect(() => {
    search("", "page");
    return () => {
      cancelRef.current?.abort();
    };
  }, []);

  return [results, isLoading, search] as const;
}

async function searchCMDB(
  searchText: string,
  signal: AbortSignal
) {
  const httpsAgent = new https.Agent({
    rejectUnauthorized: !prefs.unsafeHttps,
  });
  const init: RequestInit = {
    headers,
    method: "get",
    agent: httpsAgent,
  };

  // 查询条件定义及转码
  let query = encodeURIComponent(`${searchText}`);
  // 查询结果调用
  const apiUrl = `${cmdbUrl}/rest/insight/1.0/object/search?schemaId=${schemaId}&limit=${limit}&query=${query}&page=1&_=${timestamp}`;
  return fetch(apiUrl, init).then((response) => {
    return parseResponse(response);
  });
}

async function parseResponse(response: Response) {
  // const json = (await response.json()) as APIResponse;
  // const jsonResults = (json?.results as ResultsItem[]) ?? [];
  const jsonResults = ((await response.json()) as ResultsItem) ?? [];
  return jsonResults
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

function SearchListItem({ searchResult }: { searchResult: SearchResult }) {
  return (
    <List.Item
      title={searchResult.name}
      subtitle={searchResult.key}
      keywords={[searchResult.name, searchResult.type]}
      accessories={[
        {
          text: { value: searchResult.author },
          icon: {
            source: ${searchResult.icon},
            mask: Image.Mask.Circle,
          },
        },
      ]}
      icon={{ source: "list-icon.png" }}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action.OpenInBrowser
              title="Open in Browser"
              url={searchResult.url}
            />
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

// interface SearchResult {
//   id: number;
//   key: string;
//   subtitle: string;
//   name: string;
//   type: string;
//   typeId: string;
//   url: string;
// }
interface SearchResult {
  id: string;
  name: string;
  type: string;
  key: string;
  url: string;
  author: string;
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
  id: string;
  name: string;
  url16: string;
  url48: string;
}
