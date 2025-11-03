Do not review localization files like the ones located in "/lang". Those files are maintained by weblate.

Issue a warning if a non-localized string is shown to the user. Showing strings to the user includes actions such as: Creating a ui notification. Rendering the string into a svelte component. Setting the string as a title or description.
Be aware that in a lot of places strings will get automatically localized, so a "localize" function call is not necessary to consider a string localized.
