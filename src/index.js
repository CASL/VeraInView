import 'babel-polyfill';

import ReactDOM from 'react-dom';
import React from 'react';

import vtkURLExtract from 'vtk.js/Sources/Common/Core/URLExtract';
import { LocaleProvider } from 'antd';
import enUS from 'antd/lib/locale-provider/en_US';

import MainView from './MainView';
import EditView from './EditView';

// Process arguments from URL
const userParams = vtkURLExtract.extractURLParameters();

const mountNode = document.querySelector('.casl-vera-container');

if (userParams.edit) {
  ReactDOM.render(
    <LocaleProvider locale={enUS}>
      <EditView imageSize={1024} />
    </LocaleProvider>,
    mountNode
  );
} else {
  ReactDOM.render(
    <LocaleProvider locale={enUS}>
      <MainView imageSize={1024} />
    </LocaleProvider>,
    mountNode
  );
}
