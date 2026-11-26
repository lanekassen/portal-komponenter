import {
  SamtykkeBanner,
  type SamtykkeBannerProps,
} from "@lanekassen/portal-samtykke";
import type { ReactStory, ReactTypes } from "@storybook/react-vite";
import { HttpResponse, http } from "msw";
import preview from "../.storybook/preview";

const meta = preview.meta({
  title: "SamtykkeBanner",
  component: SamtykkeBanner,
  render(args, { component: Component }) {
    return (
      <div>
        <button
          className="ds-button"
          // @ts-expect-error https://github.com/react/react/issues/32478
          command="--show-non-modal"
          aria-haspopup="dialog"
          commandfor="samtykke-banner"
          type="button"
        >
          Change consent for cookies
        </button>
        <Component {...args} />
      </div>
    );
  },
  beforeEach({ msw }) {
    msw.use(
      http.get("/LKNO/SamtykkeBanner2", () =>
        HttpResponse.json({
          heading: null,
          subHeading: "Choose which cookies Lånekassen may use ",
          innhold: {
            tagName: "#document",
            text: null,
            attributes: {},
            children: [
              {
                tagName: "P",
                text: null,
                attributes: {},
                children: [
                  {
                    tagName: "#text",
                    text: "We use necessary cookies to ensure the website works and is safe to use. In addition, we use optional cookies to understand how you use lanekassen.no, and to improve our services.",
                    attributes: {},
                    children: [],
                  },
                ],
              },
              { tagName: "#text", text: "\n", attributes: {}, children: [] },
              {
                tagName: "P",
                text: null,
                attributes: {},
                children: [
                  {
                    tagName: "#text",
                    text: "You can choose if you accept all cookies, or only the necessary ones. Your choice is valid for 90 days. You can withdraw your consent at any time by clicking on the link below.\u00A0",
                    attributes: {},
                    children: [],
                  },
                ],
              },
            ],
          },
          footer: {
            tagName: "#document",
            text: null,
            attributes: {},
            children: [
              {
                tagName: "P",
                text: null,
                attributes: {},
                children: [
                  {
                    tagName: "A",
                    text: null,
                    attributes: {
                      title: "Click to read article about use of cookies",
                      href: "https://lanekassen.no/cookies-en",
                    },
                    children: [
                      {
                        tagName: "#text",
                        text: "Learn more about cookies",
                        attributes: {},
                        children: [],
                      },
                    ],
                  },
                ],
              },
            ],
          },
          godtarAlt: "Accept all",
          godtarValgte: "Save selected",
          godtarIkkeAlt: "Only necessary",
          pakrevdCheckboxLabel: "Necessary cookies",
          pakrevdCheckboxBeskrivelse:
            "These cookies are essential for the website to function and be secure. They are therefore stored without consent. ",
          statistikkCheckboxLabel: "Cookies for statistics and analytics",
          statistikkCheckboxBeskrivelse:
            "These cookies are set by Silktide, our analytics and statistics tool. We use them to fix errors, analyse site visits and how you navigate in the service. The information cannot identify you personally. ",
          stnoFunksjoneltCheckboxLabel: "Cookies for presenting statistics",
          stnoFunksjoneltCheckboxBeskrivelse:
            "These cookies are set by the third-party solution Power BI (Microsoft). You need to consent to this type of cookie to access statistics about our schemes. ",
          name: "Samtykkeskjema cookies",
          externalURL: null,
          pageTypeName: "SamtykkeBanner",
          sidetittel: "Samtykkeskjema cookies",
          sistePubliseringsdato: "2025-05-08T19:41:26+02:00",
          siteEndringsdato: "2026-10-19T12:38:35+02:00",
          contentLink: {
            id: 12405,
            guid: "65fd3859-0fe3-4749-823d-a4ad1521642a",
            publicUri: "/en-US/samtykkeskjema-cookies/",
          },
          parentId: 5879,
          visibleInMenu: true,
          languageSiblings: null,
          cultureName: "en-US",
        }),
      ),
      http.post(
        "/monitor/OppdaterSamtykke",
        () => new HttpResponse(null, { status: 204 }),
      ),
    );
  },
  args: {
    config: {
      monitorEndepunkt: "/monitor",
      teksterEndepunkt: "/LKNO/SamtykkeBanner2?culture=en-US",
    },
  },
});

type Story = ReactStory<ReactTypes & { args: SamtykkeBannerProps }, object>;

export const Default: Story = meta.story({});

export const ErrorOnSave: Story = meta.story({
  beforeEach({ msw }) {
    msw.use(
      http.post(
        "/monitor/OppdaterSamtykke",
        () => new HttpResponse(null, { status: 500 }),
      ),
    );
  },
});

export const ErrorOnText: Story = meta.story({
  beforeEach({ msw }) {
    msw.use(
      http.get(
        "/LKNO/SamtykkeBanner2",
        () => new HttpResponse(null, { status: 404 }),
      ),
    );
  },
});
