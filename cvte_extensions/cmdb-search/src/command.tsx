import { ActionPanel, List, showToast, Action, Toast } from "@raycast/api";
import { useEffect, useState } from "react";
import { ErrorText } from "./exception";

export type ResultItem = List.Item.Props & {
  url: string;
  linkText?: string;
};
type SearchFunction = (query: string) => Promise<ResultItem[]>;

const markdownLink = (item: ResultItem) => `[${item.linkText ?? item.title}](${item.url})`;
const htmlLink = (item: ResultItem) => `<a href="${item.url}">${item.linkText ?? item.title}</a>`;

export function SearchCommand(search: SearchFunction, searchBarPlaceholder?: string) {
  const [query, setQuery] = useState("");
  const [items, setItems] = useState<ResultItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<ErrorText>();
  useEffect(() => {
    setError(undefined);
    setIsLoading(true);
    search(query)
      .then((resultItems) => {
        setItems(resultItems);
        setIsLoading(false);
      })
      .catch((e) => {
        setItems([]);
        console.warn(e);
        if (e instanceof Error) {
          setError(ErrorText(e.name, e.message));
        }
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [query]);

  const onSearchChange = (newSearch: string) => setQuery(newSearch);
  const buildItem = (item: ResultItem) => (
    <List.Item
      key={item.id}
      {...item}
      actions={
        <ActionPanel>
          <ActionPanel.Section title="URL">
            <Action.OpenInBrowser title="浏览器打开" url={searchResult.url} />
              <Action
                title="堡垒机访问「iTerm」"
                icon={Icon.Document}
                onAction={() => runAppleScript(scriptToCreateNewTab)}
                shortcut={{ modifiers: ["cmd"], key: "b" }}
              />
              <Action.CopyToClipboard
                title="复制链接"
                content={searchResult.url}
                shortcut={{ modifiers: ["cmd"], key: "." }}
              />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );

  if (error) {
    showToast({
      style: Toast.Style.Failure,
      title: error.name,
      message: error.message,
    });
  }

  return (
    <List
      isLoading={isLoading}
      onSearchTextChange={onSearchChange}
      searchBarPlaceholder={searchBarPlaceholder}
      throttle
    >
      {items.map(buildItem)}
    </List>
  );
}
