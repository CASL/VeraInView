// ----------------------------------------------------------------------------
// XML parsing into JSON dictionary
// ----------------------------------------------------------------------------

function stringToXML(xmlStr) {
  if (window.ActiveXObject) {
    const oXML = new window.ActiveXObject('Microsoft.XMLDOM');
    oXML.loadXML(xmlStr);
    return oXML;
  }
  return new DOMParser().parseFromString(xmlStr, 'application/xml');
}

// ----------------------------------------------------------------------------

const PRIMITIVE_TYPE = {
  double(txt) {
    return Number(txt);
  },
  string(txt) {
    return txt;
  },
  int(txt) {
    return Number(txt);
  },
  bool(txt) {
    return txt.toLowerCase() === 'true';
  },
};

// ----------------------------------------------------------------------------

function typeConverter(type, value) {
  if (type.startsWith('Array')) {
    const localType = type.match(/Array\((.*)\)/)[1];
    return value
      .substring(1, value.length - 1)
      .split(',')
      .map(PRIMITIVE_TYPE[localType]);
  }
  return PRIMITIVE_TYPE[type](value);
}

// ----------------------------------------------------------------------------

function parameter(container, el) {
  const name = el.getAttribute('name');
  const type = el.getAttribute('type');
  const value = el.getAttribute('value');
  container[name] = typeConverter(type, value);
}

// ----------------------------------------------------------------------------

function parameterList(container, el) {
  const name = el.getAttribute('name');
  const listContainer = {};
  container[name] = listContainer;

  const childList = el.children ? el.children : el.childNodes;
  for (let i = 0; i < childList.length; i++) {
    const child = childList[i];
    if (child.tagName === 'ParameterList') {
      parameterList(listContainer, child);
    } else if (child.tagName === 'Parameter') {
      parameter(listContainer, child);
    }
  }

  // Return filled container
  return listContainer;
}

// ----------------------------------------------------------------------------

function parse(txt) {
  const xml = stringToXML(txt);
  const rootContainer = {};

  // Firefox/Chrome use .children, Edge/IE use .childNodes
  const childList = xml.children ? xml.children : xml.childNodes;
  if (childList) {
    for (let i = 0; i < childList.length; i++) {
      const child = childList[i];
      if (child.tagName === 'ParameterList') {
        parameterList(rootContainer, child);
      } else if (child.tagName === 'Parameter') {
        parameter(rootContainer, child);
      }
    }
  }
  return rootContainer;
}

// ----------------------------------------------------------------------------

function parseFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = function onLoad(e) {
      resolve(parse(reader.result));
    };
    reader.readAsText(file);
  });
}

export default {
  parse,
  parseFile,
};
