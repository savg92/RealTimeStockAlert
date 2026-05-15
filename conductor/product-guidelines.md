# Product Guidelines

## Prose Style
- **Clarity & Precision**: Use clear, unambiguous language. Avoid jargon unless it is industry-standard financial or technical terminology.
- **Tone**: Professional, helpful, and objective.
- **Formatting**: Use Markdown for all documentation. Use bold text for key terms and code blocks for technical references.

## Branding & Visual Design
- **Color Palette**: Professional and trustworthy. Primary colors should include a mix of deep blues or greens (symbolizing growth/stability) and clear indicators for status (e.g., green for 'above' threshold, red for 'below' threshold).
- **Typography**: Clean, sans-serif fonts (e.g., Inter, Roboto) for maximum readability on mobile screens.
- **Iconography**: Use intuitive, standard financial icons (e.g., arrows for trends, bells for alerts).

## UX Principles
- **Real-Time Feedback**: Ensure users receive immediate visual confirmation of actions (e.g., "Alert Saved").
- **Visual Hierarchy**: Prioritize stock prices and active alerts. Use clear spacing and grouping to avoid information overload.
- **Accessibility**: Adhere to WCAG 2.1 Level AA standards. Ensure high contrast and sufficient tap target sizes (min 44x44 dp).
- **Data Density**: Balance rich information with whitespace to keep the UI from feeling cluttered, especially on the stock list and detail screens.

## Performance & Reliability
- **Latency Sensitivity**: Real-time updates must be optimized for low latency. Provide visual indicators (e.g., a "live" badge) to confirm connection status.
- **Graceful Degradation**: If the WebSocket connection fails, fall back to polling or display a clear "reconnecting" state.
