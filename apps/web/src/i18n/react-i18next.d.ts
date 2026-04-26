import "react-i18next";
import zhTW from "./locales/zh-TW";

declare module "react-i18next" {
  interface CustomTypeOptions {
    defaultNS: "translation";
    resources: {
      translation: typeof zhTW;
    };
  }
}
