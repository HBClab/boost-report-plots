# Feature Spec -> Captions For Each plot
---
**OTHER RESOURCES**: [./captions.js]

## Goals
--- 
- Create captions on the same card as each plot (keeping in mind the cards with sliders to change the captions)
- Create one central location like the [./captions.js] rough example for easy modification
- Include any other relevant information in captions (different Ns etc.)
- Make sure styling of overall text caption and other numerical information is easy to read and follows good UI conventions.

## Constraints
---
- Must be on the same card as each plot
- Captions must change when cards with 2 plots are toggled to another plot - no single caption for these plots
- Captions must be modifiable in a single location
- Captions must include relevant information styled differently than the overall text caption

## Requirements
---
- Scan through the repo documentation and code to understand each plot and how they are built
- Use the chrome tool to then view the plots and understand why things look the way they do for better explanation
    e.g. why does the radial plot's SD band for accelerometry clamp to 0 during sleep hours?
- Build captions with text and relevant information for each plot
- Make sure all different text fields and other information have separate styling 
- Build individual captions for each plot
- Assess the validity and styling of captions using chrome tool again
