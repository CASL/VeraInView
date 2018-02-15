import 'babel-polyfill';

import ReactDOM from 'react-dom';
import React from 'react';

import vtkURLExtract from 'vtk.js/Sources/Common/Core/URLExtract';

import MainView from './MainView';
import EditView from './EditView';

// Process arguments from URL
const userParams = vtkURLExtract.extractURLParameters();

const mountNode = document.querySelector('.casl-vera-container');

if (userParams.edit) {
  ReactDOM.render(<EditView />, mountNode);
} else {
  ReactDOM.render(<MainView imageSize={1024} />, mountNode);
}
