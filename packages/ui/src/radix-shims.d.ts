declare module "@radix-ui/react-avatar" {
  import * as React from "react";
  export const Root: React.ForwardRefExoticComponent<React.HTMLAttributes<HTMLSpanElement> & React.RefAttributes<HTMLSpanElement>>;
  export const Image: React.ForwardRefExoticComponent<React.ImgHTMLAttributes<HTMLImageElement> & React.RefAttributes<HTMLImageElement>>;
  export const Fallback: React.ForwardRefExoticComponent<React.HTMLAttributes<HTMLSpanElement> & React.RefAttributes<HTMLSpanElement>>;
}

declare module "@radix-ui/react-checkbox" {
  import * as React from "react";
  export const Root: React.ForwardRefExoticComponent<React.ButtonHTMLAttributes<HTMLButtonElement> & { checked?: boolean | "indeterminate"; onCheckedChange?: (checked: boolean | "indeterminate") => void } & React.RefAttributes<HTMLButtonElement>>;
  export const Indicator: React.ForwardRefExoticComponent<React.HTMLAttributes<HTMLSpanElement> & React.RefAttributes<HTMLSpanElement>>;
}

declare module "@radix-ui/react-progress" {
  import * as React from "react";
  export const Root: React.ForwardRefExoticComponent<React.HTMLAttributes<HTMLDivElement> & { value?: number | null; max?: number } & React.RefAttributes<HTMLDivElement>>;
  export const Indicator: React.ForwardRefExoticComponent<React.HTMLAttributes<HTMLDivElement> & React.RefAttributes<HTMLDivElement>>;
}

declare module "@radix-ui/react-select" {
  import * as React from "react";
  export const Root: React.FC<any>;
  export const Group: React.FC<any>;
  export const Value: React.FC<any>;
  export const Trigger: React.ForwardRefExoticComponent<React.ButtonHTMLAttributes<HTMLButtonElement> & React.RefAttributes<HTMLButtonElement>>;
  export const Icon: React.ForwardRefExoticComponent<React.HTMLAttributes<HTMLSpanElement> & { asChild?: boolean } & React.RefAttributes<HTMLSpanElement>>;
  export const Portal: React.FC<any>;
  export const Content: React.ForwardRefExoticComponent<React.HTMLAttributes<HTMLDivElement> & { position?: string } & React.RefAttributes<HTMLDivElement>>;
  export const Viewport: React.ForwardRefExoticComponent<React.HTMLAttributes<HTMLDivElement> & React.RefAttributes<HTMLDivElement>>;
  export const ItemList: React.ForwardRefExoticComponent<React.HTMLAttributes<HTMLDivElement> & React.RefAttributes<HTMLDivElement>>;
  export const Item: React.ForwardRefExoticComponent<React.HTMLAttributes<HTMLDivElement> & { value: string; disabled?: boolean } & React.RefAttributes<HTMLDivElement>>;
  export const ItemText: React.ForwardRefExoticComponent<React.HTMLAttributes<HTMLSpanElement> & React.RefAttributes<HTMLSpanElement>>;
  export const ItemIndicator: React.ForwardRefExoticComponent<React.HTMLAttributes<HTMLSpanElement> & React.RefAttributes<HTMLSpanElement>>;
  export const ScrollUpButton: React.ForwardRefExoticComponent<React.HTMLAttributes<HTMLDivElement> & React.RefAttributes<HTMLDivElement>>;
  export const ScrollDownButton: React.ForwardRefExoticComponent<React.HTMLAttributes<HTMLDivElement> & React.RefAttributes<HTMLDivElement>>;
  export const Label: React.ForwardRefExoticComponent<React.HTMLAttributes<HTMLDivElement> & React.RefAttributes<HTMLDivElement>>;
  export const Separator: React.ForwardRefExoticComponent<React.HTMLAttributes<HTMLDivElement> & React.RefAttributes<HTMLDivElement>>;
}

declare module "@radix-ui/react-switch" {
  import * as React from "react";
  export const Root: React.ForwardRefExoticComponent<React.ButtonHTMLAttributes<HTMLButtonElement> & { checked?: boolean; onCheckedChange?: (checked: boolean) => void } & React.RefAttributes<HTMLButtonElement>>;
  export const Thumb: React.ForwardRefExoticComponent<React.HTMLAttributes<HTMLSpanElement> & React.RefAttributes<HTMLSpanElement>>;
}
