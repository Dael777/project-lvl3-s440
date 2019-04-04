import '@babel/polyfill';
import 'bootstrap';
import 'bootstrap/dist/css/bootstrap.min.css';
import { watch } from 'melanke-watchjs';
import validator from 'validator';
import axios from 'axios';
import i18next from 'i18next';

export default () => {
  i18next.init({
    lng: 'en',
    resources: {
      en: {
        translation: {
          incorrectUrl: 'Please enter correct URL',
          doubledUrl: 'This feed has already been added',
          noRss: 'There is no RSS channel on this address',
        },
      },
    },
  });

  const state = {
    newFeedUrl: null,
    newFeed: {
      title: null,
      description: null,
      articles: [],
    },
    updatedFeedUrl: null,
    updatedFeedArticles: null,
    formStatus: null,
    feedNumber: 0,
    addedFeeds: [],
    error: null,
  };
  const corsProxy = 'https://cors-anywhere.herokuapp.com/';
  const addFeedInput = document.querySelector('#feed-url');
  const errorShow = addFeedInput.nextElementSibling;
  const addFeedForm = document.querySelector('#add-feed-form');
  const rssFeedsContainer = document.querySelector('#rss-feeds');
  const formSpinner = document.querySelector('#form-spinner');

  const parse = (data) => {
    const feedTitle = data.getElementsByTagName('title')[0].textContent;
    const feedDescription = data.getElementsByTagName('description')[0].textContent;
    const getFeedArticles = data.querySelectorAll('item');
    const feedArticles = [...getFeedArticles].map((getFeedArticle) => {
      const feedArticle = new Map();
      const articleTitle = getFeedArticle.children[0].textContent;
      const articleDescription = getFeedArticle.children[1].textContent;
      const articleLink = getFeedArticle.children[2].textContent;
      feedArticle.set('title', articleTitle);
      feedArticle.set('description', articleDescription);
      feedArticle.set('link', articleLink);
      return feedArticle;
    });
    return {
      feedTitle,
      feedDescription,
      feedArticles,
    };
  };

  const createHtmlItems = items => items.map(
    (item, index) => `<li class="mb-1">
      <a href="${item.get('link')}">${item.get('title')}</a>
      <button type="button" class="btn btn-info" data-target="#item-${state.feedNumber}-${index}" data-toggle="modal">Description</button>
      <div class="modal fade" id="item-${state.feedNumber}-${index}" tabindex="-1" role="dialog" aria-labelledby="exampleModalLabel" aria-hidden="true">
        <div class="modal-dialog" role="document">
          <div class="modal-content">
            <div class="modal-header">
              <h5 class="modal-title" id="exampleModalLabel">Article description</h5>
              <button type="button" class="close" data-dismiss="modal" aria-label="Close">
                <span aria-hidden="true">&times;</span>
              </button>
            </div>
            <div class="modal-body">${item.get('description')}</div>
         </div>
        </div>
      </div>
      </li>`,
  ).join('');

  const updateArticles = (feedUrl) => {
    setTimeout(() => {
      axios.get(`${corsProxy}${feedUrl}`)
        .then((response) => {
          const parser = new DOMParser();
          const rss = parser.parseFromString(response.data, 'application/xml');
          const updatedFeed = parse(rss);
          state.updatedFeedUrl = feedUrl;
          state.updatedFeedArticles = updatedFeed.feedArticles;
        })
        .finally(() => {
          updateArticles(feedUrl);
        });
    }, 5000);
  };

  const showError = (errorKey) => {
    addFeedInput.classList.add('is-invalid');
    errorShow.textContent = i18next.t(errorKey);
  };

  watch(state, 'error', () => {
    addFeedInput.classList.remove('is-valid', 'is-invalid');
    if (state.error === null) {
      addFeedInput.value = '';
      return;
    }
    if (state.error === 'valid') {
      addFeedInput.classList.add('is-valid');
      return;
    }
    showError(state.error);
    addFeedInput.classList.add('is-invalid');
  });

  watch(state, 'formStatus', () => {
    if (!state.formStatus) {
      formSpinner.classList.add('d-none');
      return;
    }
    formSpinner.classList.remove('d-none');
  });

  watch(state, 'newFeedUrl', () => {
    const articlesToAdd = createHtmlItems(state.newFeed.articles);
    const row = document.createElement('div');
    row.classList.add('row');
    row.setAttribute('data-feed', state.newFeedUrl);
    row.innerHTML = `
      <div class="col-12">
        <h2>${state.newFeed.title}</h2>
        <h5>${state.newFeed.description}</h5>
        <ul>${articlesToAdd}</ul>
      </div>
    `;
    rssFeedsContainer.append(row);
    updateArticles(state.newFeedUrl);
  });

  watch(state, 'updatedFeedArticles', () => {
    const updatedFeed = document.querySelector(`[data-feed="${state.updatedFeedUrl}"]`);
    const currentArticles = updatedFeed.querySelectorAll('li a');
    const currentLinks = [...currentArticles].map(currentArticle => currentArticle.href);
    const newArticles = state.updatedFeedArticles.filter(
      updatedArticle => !currentLinks.includes(updatedArticle.get('link')),
    );
    const currentUl = updatedFeed.querySelector('ul');
    const newItems = createHtmlItems(newArticles);
    currentUl.insertAdjacentHTML('beforeEnd', newItems);
  });

  const inputValidate = () => {
    if (addFeedInput.value.length === 0) {
      state.error = null;
      return;
    }
    if (!validator.isURL(addFeedInput.value)) {
      state.error = 'incorrectUrl';
      return;
    }
    if (state.addedFeeds.indexOf(addFeedInput.value) > -1) {
      state.error = 'doubledUrl';
      return;
    }
    state.error = 'valid';
  };
  addFeedInput.addEventListener('input', inputValidate);

  const addNewFeed = (e) => {
    e.preventDefault();
    if (!state.error) {
      return;
    }
    const url = addFeedInput.value;
    state.formStatus = 'pending';
    axios.get(`${corsProxy}${url}`)
      .then((response) => {
        state.formStatus = null;
        const parser = new DOMParser();
        const rss = parser.parseFromString(response.data, 'application/xml');
        if (rss.documentElement.tagName !== 'rss') {
          state.error = 'noRss';
          return;
        }
        const newFeed = parse(rss);
        state.newFeedUrl = url;
        state.newFeed.title = newFeed.feedTitle;
        state.newFeed.description = newFeed.feedDescription;
        state.newFeed.articles = newFeed.feedArticles;
        state.feedNumber += 1;
        state.error = null;
        state.addedFeeds.push(url);
      })
      .catch((error) => {
        state.formStatus = null;
        state.error = error.message;
      });
  };
  addFeedForm.addEventListener('submit', addNewFeed);
};
