// eslint-disable-next-line @typescript-eslint/no-namespace
declare namespace tinymce {
  let PluginManager: import("tinymce").PluginManager;
}

/*
  Note: We have included the plugin in the same JavaScript file as the TinyMCE
  instance for display purposes only. Tiny recommends not maintaining the plugin
  with the TinyMCE instance and using the `external_plugins` option.
*/
tinymce.PluginManager.add("hjelptekst", (editor) => {
  const openDialog = () =>
    editor.windowManager.open({
      title: "Legg til Hjelp Tekst",
      body: {
        type: "panel",
        items: [
          {
            type: "input",
            name: "content",
            label: "Innhold",
          },
          {
            type: "input",
            name: "title",
            label: "Hjelp Tekst",
          },
        ],
      },
      buttons: [
        {
          type: "cancel",
          text: "Lukk",
        },
        {
          type: "submit",
          text: "Lagre",
          buttonType: "primary",
        },
      ],
      onSubmit: (api) => {
        const data = api.getData();
        editor.selection.setContent(
          `<span data-title="${encodeURIComponent(data.title)}">${data.content}</span>`,
        );
        api.close();
      },
      initialData: {
        content: editor.selection.getContent(),
        title: "",
      },
    });
  /* Add a button that opens a window */
  editor.ui.registry.addButton("hjelptekst", {
    text: "Hjelp Tekst",
    onAction: () => {
      openDialog();
    },
  });
  /* Adds a menu item, which can then be included in any menu via the menu/menubar configuration */
  editor.ui.registry.addMenuItem("hjelptekst", {
    text: "Hjelp Tekst",
    onAction: () => {
      openDialog();
    },
  });
  /* Return the metadata for the help plugin */
  return {
    getMetadata: () => ({
      name: "Hjelptekst",
      url: "https://design.lanekassen.no/",
    }),
  };
});
