function createImageDependencyManager(label = '') {
  let completedImages = 0;
  const listeners = [];
  let hasImage = false;

  function onImageLoaded() {
    completedImages--;
    if (completedImages === 0) {
      let count = listeners.length;
      while (count--) {
        listeners[count]();
      }
    }
  }

  function addImage(img) {
    hasImage = true;
    completedImages++;
    if (img.complete) {
      onImageLoaded();
    } else {
      img.addEventListener('load', onImageLoaded);
    }
  }

  function onImageReady(callback) {
    if (hasImage && completedImages === 0) {
      callback();
    }
    listeners.push(callback);
  }

  return {
    addImage,
    onImageReady,
  };
}

export default {
  createImageDependencyManager,
};
