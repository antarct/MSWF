# Contributing to Fumé Emerald

Thank you for your interest in contributing to **Fumé Emerald**!

## How You Can Contribute
1. **Compatibility Testing:** Test releases on different Wear OS 5/6 smartwatch hardware (Samsung Galaxy Watch series, Google Pixel Watch, Xiaomi Watch 2, etc.) and report your findings in [Issues](https://github.com/antarct/MSWF/issues).
2. **Bug Reports:** If you encounter unexpected rendering artifacts, ambient mode latching, or complication layout issues, submit a detailed report using the [Bug Report template](https://github.com/antarct/MSWF/issues/new?template=bug_report.md).
3. **Pull Requests:** Small improvements, documentation corrections, or resolution adjustments are welcome via Pull Requests.

## Code Standards
- **Pure Declarative WFF v2:** All layout and animation logic must reside exclusively in `wff-project/res/raw/watchface.xml`.
- **Zero Executable Code:** `hasCode="false"` must be strictly maintained in `AndroidManifest.xml` to comply with Wear OS 5+ battery requirements.
- **Power Efficiency:** Ambient mode On-Pixel Ratio (OPR) must stay below 5% with true `#000000` background.

## Licensing Agreement
By submitting a Pull Request, you agree that your contribution is provided under the project's [Creative Commons Attribution-NonCommercial-NoDerivatives 4.0 International License (CC BY-NC-ND 4.0)](LICENSE).
