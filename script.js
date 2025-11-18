document.addEventListener("DOMContentLoaded", function () {
  let currentLang = "pt-br"; // Default language

  function setLanguage(lang) {
    // Verifica se a tradução e o objeto translations existem
    if (!translations || !translations[lang]) {
      console.error(`Traduções para "${lang}" não encontradas.`);
      return;
    }
    currentLang = lang;
    document.documentElement.lang = lang;
    const langData = translations[lang];

    // Atualiza textos simples
    document.querySelectorAll("[data-key]").forEach((elem) => {
      const key = elem.getAttribute("data-key");
      if (langData[key]) {
        elem.innerHTML = langData[key];
      }
    });

    // Atualiza atributos (ex: placeholder)
    const searchInput = document.getElementById("search-input");
    if (searchInput) {
      searchInput.placeholder = langData["projects-search-placeholder"];
    }
  }

  // Event Listeners para os botões de idioma
  document.querySelectorAll(".lang-switcher").forEach((button) => {
    button.addEventListener("click", (e) => {
      e.preventDefault();
      const lang = e.target.getAttribute("data-lang");
      setLanguage(lang);
      // Recarrega os projetos para atualizar textos dinâmicos (como "Ver no GitHub")
      // Se a busca estiver ativa, refaz a busca com os textos novos
      if (isSearchActive) {
        handleLocalSearch(false); // false = não reseta a contagem
      } else {
        displayProjects(true); // true = reseta e limpa
      }
    });
  });

  const projectList = document.getElementById("project-list");
  const showMoreContainer = document.getElementById("show-more-container");
  const showMoreBtn = document.getElementById("show-more-btn");
  const searchInput = document.getElementById("search-input");
  const searchBtn = document.getElementById("search-btn");
  const clearSearchBtn = document.getElementById("clear-search-btn");

  const username = "joaomarcianodev";
  let allRepos = [];
  let filteredRepos = [];
  let isSearchActive = false;
  let projectsShownCount = 0;
  const projectsIncrement = 6;

  /**
   * @param {boolean} [reset=false] - Se deve limpar a lista e resetar a contagem.
   */
  function displayProjects(reset = false) {
    if (reset) {
      projectsShownCount = 0;
      projectList.innerHTML = "";
    }

    const sourceArray = isSearchActive ? filteredRepos : allRepos;
    const langData = translations[currentLang];

    if (projectsShownCount === 0) {
      projectList.innerHTML = ""; // Limpa de qualquer forma se a contagem for 0
      if (sourceArray.length === 0) {
        projectList.innerHTML = `<div class="col-12 text-center"><p>${langData["projects-not-found"]}</p></div>`;
        showMoreContainer.style.display = "none";
        return;
      }
    }

    const newLimit = Math.min(
      projectsShownCount + projectsIncrement,
      sourceArray.length
    );
    const reposToDisplay = sourceArray.slice(projectsShownCount, newLimit);

    let newCardsHTML = "";
    reposToDisplay.forEach((repo) => {
      const repoDesc = repo.description || "Sem descrição."; // A API do GitHub não fornece descrições traduzidas
      const repoLang = repo.language || "Não especificada";
      newCardsHTML += `
                <div class="col-lg-4 col-md-6 mb-4">
                    <div class="card">
                        <div class="card-body">
                            <h5 class="card-title">${repo.name}</h5>
                            <p class="card-text text-muted">${repoDesc}</p>
                            <div>
                                ${
                                  repo.language
                                    ? `<span class="badge bg-primary language-badge mb-3">${repo.language}</span>`
                                    : ""
                                }
                            </div>
                            <a href="${
                              repo.html_url
                            }" target="_blank" class="btn btn-outline-dark mt-auto">${
        langData["projects-view-github"]
      }</a>
                        </div>
                    </div>
                </div>
            `;
    });
    projectList.innerHTML += newCardsHTML;

    projectsShownCount = newLimit;

    if (projectsShownCount >= sourceArray.length) {
      showMoreContainer.style.display = "none";
    } else {
      showMoreContainer.style.display = "block";
    }
  }

  /**
   * @param {boolean} [resetCount=true] - Se deve resetar a contagem de exibição.
   */
  function handleLocalSearch(resetCount = true) {
    const query = searchInput.value.trim().toLowerCase();
    isSearchActive = true;

    if (!query) {
      clearSearch();
      return;
    }

    filteredRepos = allRepos.filter((repo) => {
      const name = repo.name.toLowerCase();
      const description = (repo.description || "").toLowerCase();
      return name.includes(query) || description.includes(query);
    });

    if (resetCount) {
      projectsShownCount = 0;
    }
    displayProjects(!resetCount); // Se não resetou a contagem, não limpa o HTML
    clearSearchBtn.style.display = "inline-block";
  }

  function clearSearch() {
    searchInput.value = "";
    isSearchActive = false;
    filteredRepos = [];
    projectsShownCount = 0;
    displayProjects();
    clearSearchBtn.style.display = "none";
  }

  function loadProjects() {
    const langData = translations[currentLang];
    projectList.innerHTML = `<div class="col-12 text-center"><div class="spinner-border text-primary" role="status"><span class="visually-hidden">${langData["projects-loading"]}</span></div><p class="mt-2">${langData["projects-loading"]}</p></div>`;
    showMoreContainer.style.display = "none";

    const cachedRepos = sessionStorage.getItem("githubRepos");

    if (cachedRepos) {
      allRepos = JSON.parse(cachedRepos);
      displayProjects();
    } else {
      fetch(
        `https://api.github.com/users/${username}/repos?sort=updated&direction=desc&per_page=100`
      )
        .then((response) => {
          if (!response.ok) {
            let errorKey = "projects-error-fetch";
            if (response.status === 403) {
              errorKey = "projects-error-limit";
            }
            throw new Error(
              translations[currentLang][errorKey] ||
                translations["en"][errorKey]
            );
          }
          return response.json();
        })
        .then((repos) => {
          allRepos = repos;
          sessionStorage.setItem("githubRepos", JSON.stringify(allRepos));
          displayProjects();
        })
        .catch((error) => {
          console.error("Erro ao carregar projetos do GitHub:", error);
          projectList.innerHTML = `<p class="text-center text-danger">${error.message}</p>`;
        });
    }
  }

  // Carregamento inicial
  setLanguage("pt-br"); // Define o idioma padrão
  loadProjects(); // Carrega os projetos

  // Event Listeners
  searchBtn.addEventListener("click", () => handleLocalSearch(true));
  searchInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") handleLocalSearch(true);
  });
  clearSearchBtn.addEventListener("click", clearSearch);
  showMoreBtn.addEventListener("click", () => displayProjects(false));
});
