# VeraInView ![Version](https://badge.fury.io/js/%40doe-casl%2Fverain-view.svg)


VeraInView is a standalone HTML file that can act as an application to visualize your VERAin XML files.

## To build

We depend on `node` to build and bundle the application. All other dependencies will be downloaded and installed when running `npm i` which includes vtk.js for the 3D rendering.

To build and bundle the application, you will need to run these commands:

```
npm i                    # Install build tools and dependencies
npm run build:release    # Transpile the application into ./dist/vera.js
npm run bundle           # Generate standalone ./dist/VeraInView.html file
npm run guide            # Generate a PDF version of the user guide 
```

## To run and share

The previous commands generate a single HTML file in `./dist/VeraInView.html`.

You can copy it to your desktop and/or share it by email.

Then just double click on the HTML file which should open your default browser.
At that point, you either have to click on the [+] button or the main window image to load the file you want to visualize or you can simply drag/drop it onto that button.

It may take some time to load your file, but once loaded, you will be able to expand the left menu and start exploring your data in a visual mode.

Please see the [Users Guide](doc/users_guide.md) for more information on interacting with the viewer.

## Feedback

We welcome your feedback! Please [submit issues](https://github.com/CASL/VeraInView/issues) for problems or enhancements.

## License

VeraInView is distributed under the OSI-approved BSD 3-clause License.
See [LICENSE](LICENSE) for details.
