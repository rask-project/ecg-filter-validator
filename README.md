# ECG Filter Validator

**ECG Filter Validator** is a static web application for visually and numerically validating the ECG high-pass filter implemented in `UnifiedMeasurement` on the `neolink` branch. It accepts the original ECG samples and the filtered samples returned by the parser, recalculates the expected filter output in the browser, and compares both signals on a chart with quantitative metrics.

The project uses **React** for the user interface, **Vite** for local development and production builds, **TypeScript** for type checking, **Tailwind CSS** for styling, and **Recharts** for signal plotting. React is a JavaScript library for building user interfaces, while Vite provides a development server and build tooling for modern front-end projects.[1] [2]

| Area | Technology | Purpose |
|---|---|---|
| UI framework | React 19 | Builds the interactive validation interface. |
| Build tool | Vite | Runs the local development server and creates production assets. |
| Language | TypeScript | Adds static type checking for safer front-end code. |
| Styling | Tailwind CSS 4 plus custom CSS | Defines the biomedical instrumentation visual system. |
| Charts | Recharts | Renders the original, received filtered, expected filtered, and reference sine-wave traces. |
| Package manager | pnpm | Installs and runs project dependencies. |

## Requirements

Install **Node.js** and **pnpm** before running the project locally. The project was generated with Node.js-oriented tooling and uses the scripts defined in `package.json`. If `pnpm` is not available on your machine, install it through the official pnpm installation instructions or enable it through Corepack when supported by your Node.js installation.[3]

## Running locally

From the project root, install dependencies and start the development server. The Vite server prints the local URL in the terminal, usually `http://localhost:3000/` in this project configuration.

```bash
pnpm install
pnpm dev
```

Open the printed URL in your browser. The page runs entirely in the browser and does not require a backend API, database, or authentication.

## Validation workflow

Paste the raw ECG samples into **Original samples** and paste the samples produced by the parser or by `measurement.ecgMV()` into **Received filtered samples**. Set the sample rate to the same frequency used when the samples were collected. The application recalculates the expected output using the same second-order Butterworth high-pass formula with a 0.8 Hz cutoff and then compares the received output against that expected output.

| Metric | Meaning | Typical interpretation |
|---|---|---|
| RMSE vs. reference | Root mean square error between received and expected filtered signals. | Lower values indicate closer numerical agreement. |
| Maximum absolute error | Largest point-by-point absolute difference. | Useful for spotting isolated spikes or precision problems. |
| Correlation | Pearson correlation between received and expected filtered signals. | Values near `1.0` indicate highly similar waveform shape. |
| DC before → after | Absolute mean before and after filtering, after the ignored transient region. | The filtered signal should usually reduce slow baseline components. |

The **Ignore initial transient** field exists because IIR filters carry state, and the first samples may include startup behavior. For synthetic or test vectors, keeping a transient skip such as `300` samples can make the steady-state comparison easier to interpret.

## Useful commands

| Command | What it does |
|---|---|
| `pnpm dev` | Starts the Vite development server. |
| `pnpm check` | Runs TypeScript type checking without emitting files. |
| `pnpm build` | Builds the production version into `dist/public`. |
| `pnpm preview` | Serves the production build locally for preview. |
| `pnpm format` | Formats project files with Prettier. |

## Production build

Create a production build with the following command.

```bash
pnpm build
```

The generated static files are placed under `dist/public`. You can serve that directory with any static web server. If you are using the Manus project interface, you can also open the project panel and use the built-in publishing or ZIP download options.

## Standalone HTML option

A standalone version was also created in the analyzed repository clone at:

```text
/home/ubuntu/analysis/tools/ecg-filter-validator.html
```

That file contains plain HTML, CSS, and JavaScript in one document. It is useful if you want to copy a single validation page into another repository without running the React/Vite project. The React version in this project is better for continued development, while the standalone file is better for quick sharing or manual validation.

## References

[1]: https://react.dev/learn "React documentation: Quick Start"
[2]: https://vite.dev/guide/ "Vite documentation: Getting Started"
[3]: https://pnpm.io/installation "pnpm documentation: Installation"
