# gummy-demo



## Run it

`gummy-demo.json` is the whole app as data. Install `@gummy-ui/ui`, import its stylesheet, and render the document inside your router:

```tsx
import { BrowserRouter } from "react-router-dom";
import { GummyApp } from "@gummy-ui/ui";
import "@gummy-ui/ui/styles.css";
import project from "./gummy/projects/gummy-demo.json";

<BrowserRouter>
  <GummyApp
    project={project}
    getToken={async () => "<bearer token>"}
    env={{ API_URL: import.meta.env.VITE_API_URL }}
  />
</BrowserRouter>
```

With `@gummy-ui/studio` installed, `gummy studio` keeps this file in `gummy/projects/` on every save, so nothing here needs to be copied by hand.

## Pages

### Page 1  `/page-1`
- key: `page1`
- 5 component(s)

## Endpoints


## Environment

The document carries these as `env`; `API_URL` is the HTTP base URL. Override any of them per environment with the `env` prop:

- `API_URL` = http://localhost:9000
