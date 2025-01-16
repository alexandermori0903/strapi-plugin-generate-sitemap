/*
 *
 * HomePage
 *
 */

import React, { useEffect, useState } from "react";
import {
  Button,
  Checkbox,
  FieldLabel,
  SingleSelect,
  SingleSelectOption,
  TextInput,
} from "@strapi/design-system";
import { Plus, Trash } from "@strapi/icons";

const HomePage = () => {
  const [contentTypes, setContentTypes] = useState([]);
  const [settings, setSettings] = useState([
    {
      contentType: null,
      priority: 0,
      loc: "",
      hasCategory: false,
      categoryContentType: null,
    },
  ]);
  const [frontendUrl, setFrontendUrl] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  useEffect(() => {
    const fetchContentTypes = async () => {
      const response = await fetch("/api/content-type-builder/content-types");
      const data = await response.json();
      setContentTypes(
        data.data.filter(
          (item) =>
            item.uid.startsWith("api::") &&
            item.schema.kind === "collectionType"
        )
      );
    };
    fetchContentTypes();
  }, []);
  const onClickAddContentType = () => {
    setSettings([
      ...settings,
      {
        contentType: null,
        priority: 0,
        loc: "",
        hasCategory: false,
        categoryContentType: null,
      },
    ]);
  };
  const onClickRemoveContentType = (index) => {
    setSettings(settings.filter((_, i) => i !== index));
  };
  const onClickGenerateSitemap = async () => {
    setIsGenerating(true);

    let text = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://www.sitemaps.org/schemas/sitemap/0.9 http://www.sitemaps.org/schemas/sitemap/0.9/sitemap.xsd">\n`;

    for (const setting of settings) {
      if (setting.contentType && setting.loc && setting.priority) {
        if (!setting.hasCategory) {
          const response = await fetch(
            `/api/${setting.contentType.schema.pluralName}`
          );
          const data = (await response.json()).data;
          const replaceParams = setting.loc.match(/\[([^\]]+)\]/g);
          data.forEach((item) => {
            let loc = setting.loc.replace("{frontend_url}", frontendUrl);
            replaceParams.forEach((param) => {
              loc = loc.replace(
                param,
                item.attributes[param.replace("[", "").replace("]", "")]
              );
            });
            text += `\t<url>\n`;
            text += `\t\t<priority>${setting.priority}</priority>\n`;
            text += `\t\t<loc>${loc}</loc>\n`;
            text += `\t\t<lastmod>${
              new Date().toISOString().split("T")[0]
            }</lastmod>\n`;
            text += `\t</url>\n`;
          });
        } else {
          if (setting.categoryContentType) {
            const response = await fetch(
              `/api/${setting.contentType.schema.pluralName}?filters[categories][$notNull]=true&populate=*`
            );
            const data = (await response.json()).data;
            const replaceParams = setting.loc.match(/\[([^\]]+)\]/g);
            data.forEach((item) => {
              let loc = setting.loc.replace("{frontend_url}", frontendUrl);
              replaceParams.forEach((param) => {
                if (param.startsWith("[category-")) {
                  const catParam = param
                    .replace("[category-", "")
                    .replace("]", "");
                  loc = loc.replace(
                    param,
                    item.attributes.categories.data[0].attributes[catParam]
                  );
                } else {
                  loc = loc.replace(
                    param,
                    item.attributes[param.replace("[", "").replace("]", "")]
                  );
                }
              });
              text += `\t<url>\n`;
              text += `\t\t<priority>${setting.priority}</priority>\n`;
              text += `\t\t<loc>${loc}</loc>\n`;
              text += `\t\t<lastmod>${
                new Date().toISOString().split("T")[0]
              }</lastmod>\n`;
              text += `\t</url>\n`;
            });
          } else {
            continue;
          }
        }
      }
    }

    text += `</urlset>`;

    // Create a downloadable file
    const blob = new Blob([text], { type: "application/xml" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "sitemap.xml";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    setIsGenerating(false);
  };

  return (
    <div style={{ color: "white", padding: "50px" }}>
      <p style={{ textAlign: "center", fontSize: "30px" }}>
        Please select content types and configure to generate sitemap
      </p>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "20px",
          marginTop: "50px",
        }}
      >
        <TextInput
          label="Frontend URL (Please use it as {frontend_url} in below loc field)"
          placeholder="https://www.example.com"
          onChange={(e) => setFrontendUrl(e.target.value)}
        />
        {settings.map((setting, index) => (
          <div key={index}>
            <div
              style={{
                display: "flex",
                gap: "10px",
                alignItems: "end",
              }}
            >
              <Button
                variant="danger"
                onClick={() => onClickRemoveContentType(index)}
              >
                <Trash />
              </Button>
              <SingleSelect
                label="Content Type"
                placeholder="Select content type"
                value={setting.contentType?.uid}
                onValueChange={(value) => {
                  const newSettings = [...settings];
                  newSettings[index].contentType = contentTypes.filter(
                    (item) => item.uid === value
                  )[0];
                  setSettings(newSettings);
                }}
              >
                {contentTypes.map((item) => (
                  <SingleSelectOption key={item.uid} value={item.uid}>
                    {item.schema.displayName}
                  </SingleSelectOption>
                ))}
              </SingleSelect>
              <TextInput
                label="Priority"
                value={setting.priority}
                placeholder="0.5"
                onChange={(e) => {
                  const newSettings = [...settings];
                  newSettings[index].priority = e.target.value;
                  setSettings(newSettings);
                }}
              />
              <div>
                <FieldLabel>Has Category</FieldLabel>
                <Checkbox
                  checked={setting.hasCategory}
                  onChange={(e) => {
                    const newSettings = [...settings];
                    newSettings[index].hasCategory = e.target.checked;
                    setSettings(newSettings);
                  }}
                />
              </div>
              {setting.hasCategory && (
                <SingleSelect
                  label="Category Content Type"
                  placeholder="Select category content type"
                  value={setting.categoryContentType?.uid}
                  onValueChange={(value) => {
                    const newSettings = [...settings];
                    newSettings[index].categoryContentType =
                      contentTypes.filter((item) => item.uid === value)[0];
                    setSettings(newSettings);
                  }}
                >
                  {contentTypes.map((item) => (
                    <SingleSelectOption key={item.uid} value={item.uid}>
                      {item.schema.displayName}
                    </SingleSelectOption>
                  ))}
                </SingleSelect>
              )}
              <TextInput
                label="Loc"
                value={setting.loc}
                placeholder={
                  setting.hasCategory
                    ? "{frontend_url}/[category-slug]/[slug]"
                    : "{frontend_url}/[slug]"
                }
                onChange={(e) => {
                  const newSettings = [...settings];
                  newSettings[index].loc = e.target.value;
                  setSettings(newSettings);
                }}
              />
            </div>
            <p style={{ marginTop: "10px" }}>
              Attributes:{" "}
              {Object.keys(setting?.contentType?.schema?.attributes ?? {}).join(
                ", "
              )}{" "}
              <span style={{ fontSize: "12px", color: "gray" }}>
                (<span style={{ color: "red" }}>&nbsp;*&nbsp;</span>please use
                it in Loc with [] mark. for example: [slug])
              </span>
            </p>
            {setting.hasCategory && (
              <p style={{ marginTop: "10px" }}>
                Category Attributes:{" "}
                {Object.keys(
                  setting?.categoryContentType?.schema?.attributes ?? {}
                ).join(", ")}{" "}
                <span style={{ fontSize: "12px", color: "gray" }}>
                  (<span style={{ color: "red" }}>&nbsp;*&nbsp;</span>please use
                  it in Loc with [category-] mark. for example: [category-slug])
                </span>
              </p>
            )}
          </div>
        ))}
        <Button
          style={{ width: "fit-content" }}
          onClick={onClickAddContentType}
        >
          <Plus />
        </Button>
      </div>
      <Button
        style={{ margin: "50px auto 0px auto" }}
        onClick={onClickGenerateSitemap}
      >
        {isGenerating ? "Generating..." : "Generate Sitemap"}
      </Button>
    </div>
  );
};

export default HomePage;
