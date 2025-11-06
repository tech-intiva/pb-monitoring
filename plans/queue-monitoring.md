build a static frontend UI (no backend) exactly like this:

- background is light grey/white with dotted grid pattern
- at the top center there is a rectangle input box labeled "search"
- under the search box add 2 toggle buttons: [ID] and [Content]
- below that show 3 vertical columns side-by-side: queue-1, queue-2, queue-n
- each queue column is a tall container
- inside each container render many small short curved strokes (use small curved svg paths or 30-40px curved rects)
- each stroke = a message
- default stroke color = yellow (#FFC94A)
- if the search input matches a message id or message content (depending on mode), highlight that stroke by coloring it red (#FF5A5A)
- do NOT hide messages — only recolor matches
- hovering a stroke shows a tiny tooltip with mock message info (id, preview)
- queue names appear at bottom of each column: “queue-1” etc
- use mock JSON data (static) to simulate messages
- use React + Typescript + TailwindCSS
- no backend code, no API calls
- output runnable app code in one bundle

visually it should look like the sketch: like vertical stacks of yellow lines, some red if matched
