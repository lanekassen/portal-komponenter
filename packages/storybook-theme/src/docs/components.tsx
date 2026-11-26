import { Card, Heading, type HeadingProps, Link } from "@lanekassen/ds-react";
import {
  LinkIcon,
  OpenBookIcon,
  ThumbDownIcon,
  ThumbUpIcon,
} from "@navikt/aksel-icons";
import type { AnchorHTMLAttributes } from "react";
import componentStyles from "./components.module.css";

export const Wide = ({
  style,
  ...rest
}: React.ComponentPropsWithoutRef<"div">) => {
  const css = { ...style, margin: "3rem calc(50% - min(900px, 50vw) + 4em)" };
  return <div style={css} {...rest} />;
};

export const getPath = (href: string | undefined): string => {
  if (!href) {
    return "";
  }

  // if link starts with /, add current path to link
  if (href.startsWith("/")) {
    // Get location from window.parent instead of document, otherwise pathname is iframe.html
    const { origin = "", pathname } = window.parent.location;

    return `${origin}${pathname}?path=${href}`;
  }

  return href;
};

const handleLinkClick =
  (href: string) => (event: React.MouseEvent<HTMLAnchorElement>) => {
    // Handle in-page anchor links
    if (href.startsWith("#")) {
      event.preventDefault();
      document
        .getElementById(decodeURIComponent(href).substring(1))
        ?.scrollIntoView({ behavior: "smooth" });
      window.parent.history.pushState(undefined, "", href);
    }
  };

export const HeadingSelfLink = ({ children, ...props }: HeadingProps) => {
  const href = `#${props.id}`;
  return (
    <Heading {...props}>
      <span>{children}</span>
      <Link
        aria-hidden
        tabIndex={-1}
        href={href}
        className={componentStyles.headingLink}
        onClick={handleLinkClick(href)}
      >
        <LinkIcon title="Link to this heading" />
      </Link>
    </Heading>
  );
};

export const StorybookLink = ({
  children = "",
  ...props
}: Omit<
  AnchorHTMLAttributes<HTMLAnchorElement>,
  "data-size" | "data-color"
>) => {
  // if link starts with /, add current path to link
  const href = getPath(props.href);

  return (
    <Link
      {...props}
      href={href}
      rel="noreferrer"
      onClick={handleLinkClick(props.href ?? "")}
    >
      {children}
    </Link>
  );
};

type ExampleItemProps = {
  text: React.ReactNode;
  aspectRatio?: string;
  zoom?: string;
  children: React.ReactNode;
};

function ExampleItem({
  "data-color": color = "success",
  text,
  aspectRatio = "16 / 9",
  zoom = "100%",
  children,
}: ExampleItemProps & {
  "data-color"?: "success" | "danger";
}) {
  const scale = parseInt(zoom, 10) / 100;
  const width = `${100 / scale}%`;

  return (
    <div className={componentStyles.exampleItem} data-color={color}>
      <div className={componentStyles.examplePreview}>
        <div
          style={{
            aspectRatio,
            scale,
            width,
          }}
        >
          {children}
        </div>
      </div>

      <p className={componentStyles.exampleCaption}>
        {color === "success" ? <ThumbUpIcon /> : <ThumbDownIcon />}
        {text}
      </p>
    </div>
  );
}

export function Example({ children }: { children: React.ReactNode }) {
  return <div className={componentStyles.example}>{children}</div>;
}

Example.Do = (props: ExampleItemProps) => (
  <ExampleItem data-color="success" {...props} />
);

Example.Dont = (props: ExampleItemProps) => (
  <ExampleItem data-color="danger" {...props} />
);

type DigDirComponentDocsLinkProps = {
  component: string;
};

export function DigDirComponentDocsLink({
  component,
}: DigDirComponentDocsLinkProps) {
  return (
    <Card variant="tinted" data-color="neutral" asChild>
      <Card.Block>
        <Heading level={2} data-size="2xs">
          <Link
            href={`https://designsystemet.no/no/components/docs/${component}/overview`}
            target="_blank"
          >
            <OpenBookIcon aria-hidden />
            <span>Se fullstendig dokumentasjon (designsystemet.no)</span>
          </Link>
        </Heading>
      </Card.Block>
    </Card>
  );
}
