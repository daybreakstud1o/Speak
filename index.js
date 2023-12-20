const clamp = (num, min, max) => Math.min(Math.max(num, min), max);
const progressOfRange = (value, min, max) => {
  return (value - min) / (max - min);
};

const shuffle = (array) => {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
};

const map = (value, x1, y1, x2, y2) =>
  ((value - x1) * (y2 - x2)) / (y1 - x1) + x2;

const colorMap = (progress, c1, c2) => {
  return [
    map(progress, 0, 1, c1[0], c2[0]),
    map(progress, 0, 1, c1[1], c2[1]),
    map(progress, 0, 1, c1[2], c2[2]),
  ];
};

const cssBezierString = ([ax, ay, bx, by]) =>
  `cubic-bezier(${ax}, ${ay}, ${bx}, ${by})`;

const reverseBezier = (curve) => [
  1 - curve[2],
  1 - curve[3],
  1 - curve[0],
  1 - curve[1],
];

function state(initial) {
  const listeners = [];
  let curr = initial;
  const set = (value) => {
    if (value === curr) return;
    curr = value;
    listeners.forEach((handler) => {
      handler(value);
    });
  };
  const get = () => curr;
  const onChange = (handler) => {
    listeners.push(handler);
    return () => {
      listeners.splice(listeners.indexOf(handler), 1);
    };
  };

  return {
    set,
    get,
    onChange,
  };
}

function onChangeAny(states = [], handler = (latest) => {}) {
  const handleStateChange = () => {
    handler(...states.map((state) => state.get()));
  };

  const cleanup = states.map((state) => {
    return state.onChange((latest) => {
      handleStateChange();
    });
  });

  return () => {
    cleanup.forEach((cleanup) => cleanup());
  };
}

const createScrollInteractionProvider = () => {
  const rangeHandlers = [];
  const handleScroll = () => {
    const scrollPos = window.scrollY;
    rangeHandlers.forEach((handler) => {
      const scrollOffset = scrollPos - handler.begin;
      const scrollProgress = scrollOffset / (handler.end - handler.begin);
      handler.callback({
        offset: scrollOffset,
        progress: clamp(scrollProgress, 0, 1),
      });
    });
  };
  const observe = (begin, end, callback = ({ progress, offset }) => {}) => {
    const handler = {
      begin,
      end,
      callback,
    };
    rangeHandlers.push(handler);

    // initial call
    callback({
      offset: 0,
      progress: 0,
    });

    return () => {
      // cleanup range
      const removeIndex = rangeHandlers.findIndex((item) => item === handler);
      rangeHandlers.splice(removeIndex, 1);
    };
  };
  window.addEventListener("scroll", handleScroll);
  const cleanup = () => {
    window.removeEventListener("scroll", handleScroll);
  };
  return {
    observe,
    cleanup,
  };
};
const scrollInteraction = createScrollInteractionProvider();

const setupFeatureInteraction = () => {
  const featureCardContainer = document.querySelector(".feature-container");
  const featureCardScrollWrapper = document.querySelectorAll(
    ".feature-container > .feature-card-scroll-wrapper",
  );

  if (!(featureCardContainer instanceof HTMLDivElement)) {
    console.log(".feature-container not found, abort setting interaction");
    return () => {};
  }

  const cardHeight = 40; // rem
  const cardPadding = 8; // rem
  const stickyTop = 13; // rem

  featureCardContainer.style.display = "flex";
  featureCardContainer.style.position = "relative";
  featureCardContainer.style.flexDirection = "column";
  featureCardContainer.style.height = `${
    cardHeight * featureCardScrollWrapper.length
  }rem`;

  [...featureCardScrollWrapper].forEach((scrollWrapper, i) => {
    const card = scrollWrapper.querySelector(".feature-card");
    const wrapper = scrollWrapper.querySelector(".feature-card-wrapper");

    if (
      !(card instanceof HTMLDivElement) ||
      !(wrapper instanceof HTMLDivElement) ||
      !(scrollWrapper instanceof HTMLDivElement)
    ) {
      return;
    }

    scrollWrapper.style.position = "sticky";
    scrollWrapper.style.top = `${cardHeight * i + stickyTop}rem`;
    scrollWrapper.style.left = `0rem`;
    scrollWrapper.style.right = `0rem`;
    scrollWrapper.style.height = `${cardHeight}rem`;
    scrollWrapper.style.width = "100%";

    wrapper.style.height = `${cardHeight * (i * 1)}rem`;
    wrapper.style.position = "absolute";
    wrapper.style.left = "0rem";
    wrapper.style.right = "0rem";
    wrapper.style.top = `${-cardHeight * i - i * 1}rem`;

    card.style.height = `${cardHeight}rem`;
  });

  // handle scroll interaction
  const allFeatureCards = document.querySelectorAll(".feature-card");
  const containerBounds = featureCardContainer.getBoundingClientRect();

  // setup animation css
  allFeatureCards.forEach((card) => {
    card.style.willChange = "transform, backgroundColor";
    card.style.transformOrigin = "center bottom";
    card.style.transition = `transform .2s cubic-bezier(0.16, 1, 0.3, 1), 
       background-color .2s cubic-bezier(0.16, 1, 0.3, 1),
       box-shadow .2s cubic-bezier(0.16, 1, 0.3, 1)`;
  });

  const handleScrollInteraction = ({ progress, offset }) => {
    [...allFeatureCards].reverse().forEach((card, index) => {
      const prevCardPos = (index - 1) / allFeatureCards.length;
      const nextCardPos = index / allFeatureCards.length;
      const transitionDuration = (nextCardPos - prevCardPos) / 2 + 0.2;
      const cardTransformProgress = map(
        progress,
        prevCardPos - transitionDuration,
        prevCardPos + transitionDuration,
        0,
        1,
      );

      const scale = clamp(map(cardTransformProgress, 0, 1, 0.9, 1), 0, 1);
      const yOffset = clamp(map(cardTransformProgress, 0, 1, 25, 0), 0, 25);
      const color = colorMap(
        map(cardTransformProgress, 0, 0.8, 0, 1),
        [239, 243, 255],
        [255, 255, 255],
      );
      const shadowBlur = clamp(map(cardTransformProgress, 0, 1, 0, 50), 0, 50);
      const shadowOpacity = clamp(
        map(cardTransformProgress, 0, 1, 0, 0.1),
        0,
        0.1,
      );

      card.style.transform = `scale(${scale}) translateY(${yOffset}px)`;
      card.style.backgroundColor = `rgb(${color[0]},${color[1]},${color[2]})`;
      card.style.boxShadow = `0px 0px ${shadowBlur}px 0px rgba(56, 56, 56, ${shadowOpacity})`;
    });
  };

  const cleanupScroll = scrollInteraction.observe(
    containerBounds.top + window.scrollY,
    containerBounds.top + window.scrollY + containerBounds.height,
    handleScrollInteraction,
  );

  return () => {
    cleanupScroll();
  };
};

// ===========================================================================
//
// infinite comments
//
// ===========================================================================

function setupInfiniteComments() {
  const container = document.querySelector(".comment-card-container");
  if (!container) {
    console.log(".comment-card-container not found, abort setting interaction");
    return () => {};
  }

  const comments = [...container.querySelectorAll(".comment-card")];

  container.style.width = "100%";
  container.style.overflow = "hidden";
  container.style.display = "flex";
  container.style.flexDirection = "column";
  container.style.gap = "24px";

  // figure out how many child required
  const containerBounds = container.getBoundingClientRect();
  const containerWidth = containerBounds.width;
  const cardWidth = comments[0].getBoundingClientRect().width;
  const gap = 24;
  const visibleCommentsPerRow = Math.ceil(containerWidth / (cardWidth + gap));
  const commentsPerRow = visibleCommentsPerRow + 5;

  // figure out how many
  console.log(`Comments per row ${commentsPerRow}`);

  const commentsInRow1 = shuffle(comments).slice(0, commentsPerRow - 1);
  const commentsInRow2 = shuffle(comments).slice(0, commentsPerRow - 1);
  // const commentsInRow2 = comments.slice(
  //   commentsPerRow,
  //   commentsPerRow + commentsPerRow - 1,
  // );

  const commentRows = [
    createCommentRow(commentsInRow1, gap),
    createCommentRow(commentsInRow2, gap),
  ];

  container.replaceChildren(...commentRows);

  // scroll
  commentRows.forEach((row) => {
    row.style.transition = "transform .5s cubic-bezier(0.16, 1, 0.3, 1)";
  });

  // scroll interaction
  const cleanupScroll = scrollInteraction.observe(
    containerBounds.top + window.scrollY,
    containerBounds.top + window.scrollY + containerBounds.height,
    ({ offset }) => {
      commentRows.forEach((row, i) => {
        const direction = i % 2 === 1 ? -1 : 1;
        row.style.transform = `translateX(${
          offset * 0.35 * direction - 500
        }px)`;
      });
    },
  );

  return () => {
    cleanupScroll();
  };
}

function createCommentRow(comments = [], gap = 12) {
  const row = document.createElement("div");
  row.style.display = "flex";
  row.style.flexDirection = "row";
  row.style.flexWrap = "nowrap";
  row.style.gap = `${gap}px`;

  comments.forEach((comment) => {
    row.appendChild(comment.cloneNode(true));
  });
  return row;
}

// ===========================================================================
//
// FAQ Section
//
// ===========================================================================

function setupFaq() {
  const faqItems = [...document.querySelectorAll(".faq-item-new")];
  const itemCleanups = faqItems.map((item) => {
    const toggle = item.querySelector(".faq-item__toggle");
    const answer = item.querySelector(".faq-item__answer");
    const answerWrapper = item.querySelector(".faq-item__answer-wrapper");
    const icon = item.querySelector(".faq-item__icon");

    answerWrapper.style.overflow = "hidden";
    // answer.style.boxSizing = "border-box";
    answerWrapper.style.transition = "height .5s cubic-bezier(0.16, 1, 0.3, 1)";
    icon.style.transition = "transform .5s cubic-bezier(0.16, 1, 0.3, 1)";

    const isOpened = state(undefined);
    const cleanup = isOpened.onChange((isOpened) => {
      const openedHeight = answer.getBoundingClientRect().height;

      if (isOpened) {
        icon.style.transform = "rotate(45deg)";
        answerWrapper.style.height = `${openedHeight}px`;
        return;
      }
      icon.style.transform = "rotate(0deg)";
      answerWrapper.style.height = "0px";
    });

    isOpened.set(false);

    const handleItemClick = () => {
      isOpened.set(!isOpened.get());
    };

    toggle.addEventListener("click", handleItemClick);
    return () => {
      cleanup();
      toggle.removeEventListener("click", handleItemClick);
    };
  });

  return () => {
    itemCleanups.forEach((cleanup) => cleanup());
  };
}

// ===========================================================================
//
// Video Card
//
// ===========================================================================
function setupVideoCard() {
  const allVideoCards = [...document.querySelectorAll(".video-card-new")];
  const isOpened = state(false);
  const isHovering = state(false);
  const hoveringVideoCard = state(0);

  const modal = createPopupVideoModal();
  let currentClickedVideo = null;
  let currentClickedVideoDimension = {};
  let currentHeading = "";
  let currentDescription = "";

  const handleCloseButtonClick = () => {
    isOpened.set(false);
  };
  modal.closeButton.elm.addEventListener("click", handleCloseButtonClick);

  const videoCardCleanups = allVideoCards.map((card) => {
    const handleVideoCardClick = () => {
      currentClickedVideo = card.querySelector("video");
      currentClickedVideoDimension = card
        .querySelector(".video-card__wrapper")
        .getBoundingClientRect();
      currentHeading = card.querySelector(".video-card__heading").textContent;
      currentDescription = card.querySelector(
        ".video-card__description",
      ).textContent;

      isOpened.set(true);
    };
    card.addEventListener("click", handleVideoCardClick);
    return () => {
      card.removeEventListener("click", handleVideoCardClick);
    };
  });

  isOpened.onChange((isOpened) => {
    if (isOpened && currentClickedVideo !== null) {
      modal.open(
        currentClickedVideoDimension.width,
        currentClickedVideoDimension.height,
        currentClickedVideoDimension.left,
        currentClickedVideoDimension.top + window.scrollY,
        currentClickedVideo,
        currentHeading,
        currentDescription,
      );
      return;
    }
    modal.close();
  });

  const handleWindowScroll = () => {
    isOpened.set(false);
  };

  window.addEventListener("scroll", handleWindowScroll);

  // ====================================
  // setup video card hover state
  // ====================================

  allVideoCards.forEach((card) => {
    card.style.transition = "opacity 0.5s cubic-bezier(0.16, 1, 0.3, 1)";
  });

  const handleVideoCardMouseEnter = (e) => {
    // video card enter
    const index = allVideoCards.indexOf(e.target);
    hoveringVideoCard.set(index);
    isHovering.set(true);
  };
  const handleVideoCardMouseLeave = (e) => {
    isHovering.set(false);
  };

  const updateVideoFocusState = (isHovering, hoveringVideoCard) => {
    allVideoCards.forEach((card, i) => {
      const video = card.querySelector("video");

      if (!isHovering) {
        card.style.opacity = `1`;
        card.querySelector(".video-card__button").style.opacity = `1`;
        video.currentTime = 0;
        video.pause();
        return;
      }
      if (i === hoveringVideoCard) {
        card.style.opacity = `1`;
        card.querySelector(".video-card__button").style.opacity = `1`;
        video.play();
        return;
      }
      video.pause();
      card.style.opacity = `.5`;
      card.querySelector(".video-card__button").style.opacity = `0`;
    });
  };
  const cleanupVideoFocusStateHandler = onChangeAny(
    [isHovering, hoveringVideoCard],
    updateVideoFocusState,
  );

  allVideoCards.forEach((card) => {
    card.addEventListener("mouseenter", handleVideoCardMouseEnter);
    card.addEventListener("mouseleave", handleVideoCardMouseLeave);
  });

  return () => {
    cleanupVideoFocusStateHandler();
    videoCardCleanups.forEach((cleanup) => cleanup());
    window.removeEventListener("scroll", handleWindowScroll);
    modal.closeButton.elm.removeEventListener("click", handleCloseButtonClick);
    modal.cleanup();
    allVideoCards.forEach((card) => {
      card.removeEventListener("mouseenter", handleVideoCardMouseEnter);
      card.removeEventListener("mouseleave", handleVideoCardMouseLeave);
    });
  };
}

function createPopupVideoModal() {
  const scrim = document.createElement("div");
  const model = document.createElement("div");
  const video = document.createElement("video");

  model.style.position = "absolute";
  model.style.left = "0px";
  model.style.top = "0px";
  model.style.opacity = "0";

  scrim.style.position = "fixed";
  scrim.style.zIndex = "999";
  scrim.style.left = "0px";
  scrim.style.top = "0px";
  scrim.style.bottom = "0px";
  scrim.style.right = "0px";
  scrim.style.backdropFilter = `blur(20px)`;
  scrim.style.opacity = "0";
  scrim.style.pointerEvents = "none";
  scrim.style.transition = "opacity 0.5s cubic-bezier(0.16, 1, 0.3, 1)";
  scrim.style.backgroundColor = "rgba(0, 0, 0, 0.35)";

  video.style.width = "100%";
  video.style.height = "100%";
  video.style.objectFit = "cover";
  video.style.borderRadius = "16px";
  video.style.backgroundColor = "#FFF";
  video.style.zIndex = "1000";
  video.style.position = "relative";

  document.body.append(scrim);
  model.append(video);
  document.body.append(model);

  const infoModule = {
    heading: document.createElement("h3"),
    description: document.createElement("div"),
    container: document.createElement("div"),
  };
  infoModule.container.style.position = "absolute";
  infoModule.container.style.top = "-5rem";
  infoModule.container.style.left = "0";
  infoModule.container.style.right = "0";
  infoModule.container.style.textAlign = "center";
  infoModule.container.style.color = "#FFF";
  infoModule.container.style.transition =
    "opacity 0.5s cubic-bezier(0.16, 1, 0.3, 1)";

  infoModule.heading.className = "heading-3 video-card__heading";
  infoModule.description.className = "description video-card__description";

  infoModule.container.append(infoModule.heading, infoModule.description);
  model.append(infoModule.container);

  let originOffsetX = 0;
  let originOffsetY = 0;
  let isOpened = false;

  const closeButton = createCloseButton(model);

  const open = (
    width = 100,
    height = 100,
    fromX = 0,
    fromY = 0,
    videoElm,
    heading = "heading",
    description = "description",
  ) => {
    isOpened = true;

    // update info
    infoModule.heading.innerHTML = heading;
    infoModule.heading.style.color = "#fff";
    infoModule.heading.style.textAlign = "center";
    infoModule.description.innerHTML = description;
    infoModule.description.style.color = "#fff";
    infoModule.description.style.textAlign = "center";

    // load new sources in the video
    video.innerHTML = "";
    const allSources = videoElm.querySelectorAll("source");
    allSources.forEach((source) => {
      video.append(source.cloneNode());
    });
    video.load();
    video.play();
    video.muted = true;
    video.controls = true;

    const scrollY = window.scrollY;
    const top = scrollY + window.innerHeight / 2 - height / 2;
    const left = window.innerWidth / 2 - width / 2;
    originOffsetX = fromX - left;
    originOffsetY = fromY - top;

    model.style.zIndex = "1000";
    model.style.transition = "none";
    model.style.transform = `translate(${originOffsetX}px, ${originOffsetY}px)`;
    model.style.pointerEvents = "all";

    requestAnimationFrame(() => {
      model.style.opacity = `1`;
      model.style.transition = `
        transform 0.5s cubic-bezier(0.16, 1, 0.3, 1)
      `;
      model.style.transform = `translate(${0}px, ${0}px)`;
    });

    model.style.width = `${width}px`;
    model.style.height = `${height}px`;
    model.style.top = `${top}px`;
    model.style.left = `${left}px`;

    scrim.style.opacity = "1";
    scrim.style.pointerEvents = "all";

    closeButton.show();
  };
  const close = () => {
    isOpened = false;
    video.pause();
    video.controls = false;
    scrim.style.opacity = "0";
    scrim.style.pointerEvents = "none";
    model.style.transform = `translate(${originOffsetX}px, ${originOffsetY}px)`;
    model.style.pointerEvents = "none";

    infoModule.container.style.opacity = "0";

    model.style.zIndex = "0";

    closeButton.hide();
  };

  const handleTransition = () => {
    if (isOpened) {
      infoModule.container.style.opacity = "1";
      return;
    }
    model.style.opacity = `0`;
  };
  model.addEventListener("transitionend", handleTransition);

  const cleanup = () => {
    document.body.removeChild(model);
    document.body.removeChild(scrim);
  };

  return {
    open,
    close,
    closeButton,
    cleanup,
  };
}

function createCloseButton(parent) {
  const closeButton = document.createElement("button");
  const closeIcon = `
    <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M16 8V24M24 16H8" stroke="white" stroke-width="2.66667" stroke-linecap="round"/>
    </svg>
  `;
  closeButton.style.width = `48px`;
  closeButton.style.height = `48px`;
  closeButton.classList.add("demo-close-button");
  closeButton.style.display = "flex";
  closeButton.style.justifyContent = "center";
  closeButton.style.alignItems = "center";
  closeButton.style.backgroundColor = `rgba(0, 0, 0, 0.5)`;
  closeButton.style.borderRadius = `50%`;
  closeButton.style.overflow = `hidden`;
  closeButton.style.position = "absolute";
  closeButton.style.right = `${-48 - 16}px`;
  closeButton.style.top = "0px";
  closeButton.style.zIndex = 1;
  closeButton.style.transition = `
    transform .5s cubic-bezier(0.16, 1, 0.3, 1)
  `;

  closeButton.innerHTML = closeIcon;

  parent.append(closeButton);

  return {
    show: () => {
      closeButton.style.transform = `translate(${0}px, ${0}px) rotate(45deg)`;
    },
    hide: () => {
      closeButton.style.transform = `translate(${-64}px, ${0}px) rotate(0deg)`;
    },
    elm: closeButton,
  };
}

// ===========================================================================
//
// Language CTA
//
// ===========================================================================

function setupLanguageCTA(container) {
  const sheetElm = container.querySelector(".language-selector__sheet");
  const items = [...container.querySelectorAll(".language-selector__item")];
  const currentSelectionElm = container.querySelector(
    ".language-selector__selection",
  );
  const submitButtonElm = container.querySelector(".language-selector__button");

  if (!(sheetElm instanceof HTMLDivElement)) return;
  if (!(currentSelectionElm instanceof HTMLDivElement)) return;

  const currentSelection = state(0);
  const isOpened = state(undefined);

  sheetElm.style.transition = `
    opacity .5s cubic-bezier(0.16, 1, 0.3, 1),
    height .5s cubic-bezier(0.16, 1, 0.3, 1)
  `;
  sheetElm.style.overflow = "hidden";

  isOpened.onChange((isOpened) => {
    if (isOpened) {
      const selectorHeight =
        currentSelectionElm.getBoundingClientRect().height + 24;
      const contentHeight =
        items[0].getBoundingClientRect().height * items.length;

      sheetElm.style.pointerEvents = "all";
      sheetElm.style.opacity = "1";
      sheetElm.style.height = `${contentHeight + selectorHeight}px`;

      currentSelectionElm.style.backgroundColor = "#FFF";
      return;
    }

    sheetElm.style.opacity = "0";
    sheetElm.style.height = "0px";
    sheetElm.style.pointerEvents = "none";

    currentSelectionElm.style.backgroundColor = "#F5F5F5";
  });

  const selectionList = items.map((itemElm, i) => {
    const iconElm = itemElm.querySelector(".language-selector__icon");
    const labelElm = itemElm.querySelector(".language-selector__label");

    if (!(labelElm instanceof HTMLDivElement)) return;

    const handleItemClick = () => {
      if (!isOpened.get()) return;
      currentSelection.set(i);
    };
    itemElm.addEventListener("click", handleItemClick);
    const cleanup = () => itemElm.removeEventListener("click", handleItemClick);

    return {
      icon: iconElm instanceof HTMLImageElement ? iconElm.src : undefined,
      label: labelElm.innerText,
      elm: itemElm,
      cleanup,
    };
  });

  // select the default item
  selectionList.forEach((item, i) => {
    if (item.elm.classList.contains("language-selector__item--selected")) {
      currentSelection.set(i);
    }
  });

  currentSelection.onChange((index) => {
    const selected = selectionList[index];
    const iconElm = currentSelectionElm.querySelector(
      ".language-selector__icon",
    );
    const labelElm = currentSelectionElm.querySelector(
      ".language-selector__label",
    );

    // update the visual of the selected
    if (iconElm instanceof HTMLImageElement) {
      iconElm.src = selected.icon;
    }
    if (labelElm instanceof HTMLDivElement) {
      labelElm.innerText = selected.label;
    }

    // update the active state
    selectionList.forEach((item, i) => {
      if (index === i) {
        item.elm.className =
          "language-selector__item language-selector__item--selected";
        return;
      }
      item.elm.className = "language-selector__item";
    });
  });

  const handleSelectionClick = (e) => {
    e.stopPropagation();
    isOpened.set(!isOpened.get());
  };
  currentSelectionElm.addEventListener("click", handleSelectionClick);

  const handleClickOutside = () => isOpened.set(false);
  document.body.addEventListener("click", handleClickOutside);

  const handleSubmitButtonClick = () => {
    // submit here
    const selected = selectionList[currentSelection.get()];
    alert(`submit ${selected.label}`);
  };
  submitButtonElm &&
    submitButtonElm.addEventListener("click", handleSubmitButtonClick);

  // trigger update as initial state
  isOpened.set(false);

  return () => {
    currentSelectionElm.removeEventListener("click", handleSelectionClick);
    submitButtonElm &&
      submitButtonElm.removeEventListener("click", handleSubmitButtonClick);
    document.body.removeEventListener("click", handleClickOutside);
    selectionList.forEach((item) => item.cleanup());
  };
}

// ===========================================================================
//
// Career carousel
//
// ===========================================================================

async function setupCareerCarousel() {
  // career
  const container = document.querySelector(".life-carousel");

  if (!container) return () => {};

  const storyBlurbsElms = [
    ...container.querySelectorAll(".our-story-blurb-info"),
  ];

  // const storyBlurbs = storyBlurbsElms.map((elm) => {
  //   return {
  //     header: elm.children[0].innerText,
  //     body: elm.children[1].innerText,
  //   };
  // });

  // all the images inside the section
  const originalImgs = [...container.querySelectorAll("img")];
  const careerImgsList = originalImgs.map((elm) => elm.cloneNode());

  // wait for all images being loaded
  const imgLoadPromises = originalImgs.map((img) => {
    img.loading = "eager";

    return new Promise((resolve) => {
      if (img.complete) {
        resolve();
        return;
      }
      img.onload = () => {
        resolve();
      };
    });
  });

  await Promise.all(imgLoadPromises);

  // hide all the images
  originalImgs.forEach((img) => {
    img.style.opacity = "0";
  });

  // init carousel
  function createImageStrip(container, sourceImages = [], indexPadding = 0) {
    const allImages = sourceImages.map((img) => img.cloneNode());

    const cleanup = () => {
      allImages.forEach((img) => {
        container.removeChild(img);
      });
    };

    const update = (currentIndex = 0) => {
      const containerBounds = container.getBoundingClientRect();
      const gridGap = getComputedStyle(container).gap;

      const bigImageBounds = originalImgs[0].getBoundingClientRect();
      const bigImageWidth = bigImageBounds.width;
      const bigImageHeight = bigImageBounds.height;

      const smallImageBounds = originalImgs[1].getBoundingClientRect();
      const smallImageWidth = smallImageBounds.width;
      const smallImageHeight = smallImageBounds.height;

      // style the images base on current index
      allImages.forEach((img, index) => {
        const i = index + indexPadding;
        const shouldEmphasized = i === currentIndex;

        const offsetX = (() => {
          if (i > currentIndex) {
            return (
              smallImageWidth * (i - currentIndex - 1) +
              bigImageWidth +
              parseInt(gridGap) +
              parseInt(gridGap) * (i - currentIndex - 1)
            );
          }

          if (i < currentIndex) {
            return (smallImageWidth + parseInt(gridGap)) * (i - currentIndex);
          }
          return 0;
        })();

        const offsetY = shouldEmphasized
          ? bigImageBounds.top - containerBounds.top
          : smallImageBounds.top - containerBounds.top;

        img.style.position = "absolute";
        img.style.width = `${
          shouldEmphasized ? bigImageWidth : smallImageWidth
        }px`;
        img.style.height = `${
          shouldEmphasized ? bigImageHeight : smallImageHeight
        }px`;
        img.style.left = "0px";
        img.style.top = "0px";
        img.style.transform = `translate(${offsetX}px, ${offsetY}px)`;
      });
    };

    // init the strip
    update(0);

    // only apply the animation AFTER initialisation
    allImages.forEach((img) => {
      img.style.transition = `
        transform 0.3s cubic-bezier(0.165, 0.84, 0.44, 1),
        height 0.5s cubic-bezier(0.165, 0.84, 0.44, 1),
        width 0.3s cubic-bezier(0.165, 0.84, 0.44, 1)
      `;
      img.style.pointerEvents = "none";
      img.style.opacity = "1";
      container.appendChild(img);
    });

    return {
      cleanup,
      update,
    };
  }

  const strips = [createImageStrip(container, careerImgsList, 0)];
  let minStripIndex = 0;
  let maxStripIndex = 0;
  const stripBuffer = careerImgsList.length;

  // carousel click interaction
  const carouselIndex = state(undefined);
  carouselIndex.onChange((latestIndex) => {
    while (minStripIndex > latestIndex - stripBuffer) {
      minStripIndex -= stripBuffer;
      strips.push(createImageStrip(container, careerImgsList, minStripIndex));
    }
    while (maxStripIndex < latestIndex + stripBuffer) {
      maxStripIndex += stripBuffer;
      strips.push(createImageStrip(container, careerImgsList, maxStripIndex));
    }

    strips.forEach((strip) => strip.update(latestIndex));

    // update the description
    storyBlurbsElms.forEach((blurb, index) => {
      const blurbIndex = (() => {
        const index = latestIndex % storyBlurbsElms.length;
        // going positive direction in index;
        if (index >= 0) {
          return index;
        }
        // going negative direction in index
        return storyBlurbsElms.length - Math.abs(index);
      })();
      const isCurrentBlurb = blurbIndex === index;

      if (isCurrentBlurb) {
        blurb.style.display = "flex";
        return;
      }
      blurb.style.display = "none";
    });
  });
  carouselIndex.set(0);

  const prevButton = container.querySelector(".next");
  const nextButton = container.querySelector(".previous");

  const handleNextClick = () => {
    carouselIndex.set(carouselIndex.get() + 1);
  };
  const handlePrevClick = () => {
    carouselIndex.set(carouselIndex.get() - 1);
  };
  prevButton.addEventListener("click", handleNextClick);
  nextButton.addEventListener("click", handlePrevClick);

  return () => {
    prevButton.removeEventListener("click", handleNextClick);
    nextButton.removeEventListener("click", handlePrevClick);

    strips.forEach((strip) => {
      strip.cleanup();
    });
  };
}

function setupCareerCarouselSync() {
  let cleanupFunction = () => {};
  setupCareerCarousel().then((cleanup) => {
    cleanupFunction = cleanup;
  });

  return () => {
    cleanupFunction();
  };
}

// ============================================================
//
// Setup Code BEGIN
//
// ============================================================

function setup() {
  const cleanupVideoCard = setupVideoCard();
  const cleanupCareerCarousel = setupCareerCarouselSync();

  const languageCTAContainers = [
    ...document.querySelectorAll(".language-selector"),
  ];
  const allLanguageCTACleanup = languageCTAContainers.map((container) =>
    setupLanguageCTA(container),
  );

  const cleanupFeatureInteraction = setupFeatureInteraction();
  const cleanupInfiniteComments = setupInfiniteComments();
  const cleanupFaq = setupFaq();

  return () => {
    cleanupVideoCard();
    cleanupCareerCarousel();
    allLanguageCTACleanup.forEach((cleanup) => cleanup());
    cleanupFeatureInteraction();
    cleanupInfiniteComments();
    cleanupFaq();
  };
}

// resize and refresh the page
let globalCleanup = () => {};
function reset() {
  globalCleanup();
  globalCleanup = setup();
}

window.addEventListener("resize", () => reset());
reset();

// ============================================================
//
// Setup Code END
//
// ============================================================
