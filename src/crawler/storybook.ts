import path from 'path';
import { firefox } from 'playwright';
import { ShotItem } from '../shots/shots';

export type Story = {
  id: string;
  kind: string;
  story: string;
  parameters: Record<string, unknown>;
};

interface StorybookClientApi {
  raw?: () => Story[];
}

type WindowObject = typeof window & {
  __STORYBOOK_CLIENT_API__: StorybookClientApi;
};

type CrawlerResult = {
  stories: Story[] | null;
};

export const getStoryBookUrl = (url: string) => {
  if (
    url.startsWith('http://') ||
    url.startsWith('https://') ||
    url.startsWith('file://')
  ) {
    return url;
  }

  if (url.startsWith('/')) {
    return `file://${url}`;
  }

  return `file://${path.normalize(path.join(process.cwd(), url))}`;
};

export const getIframeUrl = (url: string) =>
  url.endsWith('/') ? `${url}iframe.html` : `${url}/iframe.html`;

export const collectStories = async (url: string) => {
  const browser = await firefox.launch();
  const page = await browser.newPage();
  const iframeUrl = getIframeUrl(url);

  await page.goto(iframeUrl);

  await page.waitForFunction(
    () => (window as WindowObject).__STORYBOOK_CLIENT_API__,
    {
      timeout: 30_000,
    },
  );

  const result = await page.evaluate(
    () =>
      new Promise<CrawlerResult>((res) => {
        const fetchStories = () => {
          const { __STORYBOOK_CLIENT_API__: api } = window as WindowObject;

          if (api.raw) {
            const stories: Story[] = api.raw().map((item) => ({
              id: item.id,
              kind: item.kind,
              story: item.story,
              parameters: item.parameters,
            }));

            res({ stories });
          } else {
            throw new Error('Stories not found');
          }
        };

        fetchStories();
      }),
  );

  await browser.close();

  return result;
};

const generateFilePath = (story: Story) => {
  const fileName = `${story.id}.png`;
  const filePath = path.join(process.cwd(), '.lostpixel', fileName);

  return filePath;
};

export const generateShotItems = (
  baseUrl: string,
  stories: Story[],
): ShotItem[] => {
  const iframeUrl = getIframeUrl(getStoryBookUrl(baseUrl));

  const shotItems = stories.map((story) => {
    const filePath = generateFilePath(story);

    return {
      id: story.id,
      url: `${iframeUrl}?id=${story.id}&viewMode=story`,
      filePath,
    };
  });

  return shotItems;
};
