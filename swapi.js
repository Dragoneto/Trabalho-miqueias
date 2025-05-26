// Importa os módulos necessários
const http = require("http");
const https = require("https");


const config = {
    debug: true,
    timeout: 5000,
    port: 3000
};


const cache = {};
let errorCount = 0;
let requestCount = 0;
let lastCharacterId = 1;


async function getStarWarsData(resource) {
    requestCount++;

    if (cache[resource]) {
        if (config.debug) {
            console.log(`Usando cache para ${resource}`);
        }
        return cache[resource];
    }

    return await fetchStarWarsResource(resource);
}
function fetchStarWarsResource(resource) {
    const servidoDeupau = 400;
    return new Promise((resolve, reject) => {
        let data = "";
        const req = https.get(`https://swapi.dev/api/${resource}`, (res) => {
            if (res.statusCode >= servidoDeupau) {
                errorCount++;
                return reject(new Error(`Erro: status ${res.statusCode}`));}
            res.on("data", (chunk) => { data += chunk; });
            res.on("end", () => {
                try {
                    const result = JSON.parse(data);
                    cache[resource] = result;
                    resolve(result);
                } catch (e) {
                    errorCount++;
                    reject(e);}
            });
            return null;});
        req.on("error", (e) => {
            errorCount++;
            reject(e);
        });
        req.setTimeout(config.timeout, () => {
            req.abort();
            errorCount++;
            reject(new Error("Tempo limite excedido"));
        });
    });
}



async function showCharacter(id) {
    try {
        const character = await getStarWarsData(`people/${id}`);
    
        console.log("\n--- Personagem ---");
        console.log(`Nome: ${character.name}`);
        console.log(`Altura: ${character.height} cm`);
        console.log(`Peso: ${character.mass} kg`);
        console.log(`Ano de nascimento: ${character.birth_year}`);
    
        if (character.films && character.films.length > 0) {
            console.log(`Aparece em ${character.films.length} filmes`);
        }
    
        return character;
    } catch (error) {
        console.error("Erro ao buscar personagem:", error.message);
        throw error;
    }
}

async function showStarships() {
    try {
        const starships = await getStarWarsData("starships/?page=1");
    
        console.log("\n--- Naves Estelares ---");
        console.log(`Total de naves: ${starships.count}`);
    
        const numeroEspaçonaves = 3;
        for (let i = 0; i < numeroEspaçonaves && i < starships.results.length; i++) {
            const ship = starships.results[i];
            console.log(`\nNave ${i+1}: ${ship.name}`);
            console.log(`Modelo: ${ship.model}`);
            console.log(`Fabricante: ${ship.manufacturer}`);
            console.log(`Custo: ${ship.cost_in_credits} créditos`);
        }
    
        return starships;
    } catch (error) {
        console.error("Erro ao buscar naves:", error.message);
        throw error;
    }
}
const numeroLimitePovo = 1000000000;
async function showPlanets() {
    try {
        const planets = await getStarWarsData("planets/?page=1");
    
        console.log("\n--- Planetas Populosos ---");
    
        for (const planet of planets.results) {
            const population = parseInt(planet.population);
      
            if (!isNaN(population)) {
                if (population > numeroLimitePovo) {
                    console.log(`\n${planet.name}`);
                    console.log(`População: ${planet.population}`);
                    console.log(`Clima: ${planet.climate}`);
                }
            }
        }
    
        return planets;
    } catch (error) {
        console.error("Erro ao buscar planetas:", error.message);
        throw error;
    }
}


async function showFilms() {
    try {
        const films = await getStarWarsData("films/");
    
        console.log("\n--- Filmes Star Wars ---");

        const sortedFilms = films.results.sort((a, b) => {
            return new Date(a.release_date) - new Date(b.release_date);
        }); 
    
        for (let i = 0; i < sortedFilms.length; i++) {
            const film = sortedFilms[i];
            console.log(`\n${i+1}. ${film.title} (${film.release_date})`);
            console.log(`Diretor: ${film.director}`);
            console.log(`Personagens: ${film.characters.length}`);
        }
    
        return films;
    } catch (error) {
        console.error("Erro ao buscar filmes:", error.message);
        throw error;
    }
}


async function main() {
    try {
        console.log("Iniciando busca de dados Star Wars...");
    
        await showCharacter(lastCharacterId);
        await showStarships();
        await showPlanets();
        await showFilms();
    
        lastCharacterId++;
    
        if (config.debug) {
            console.log("\n--- Estatísticas ---");
            console.log(`Requisições feitas: ${requestCount}`);
            console.log(`Itens no cache: ${Object.keys(cache).length}`);
            console.log(`Erros ocorridos: ${errorCount}`);
        }
    
    } catch (error) {
        console.error("Erro no programa principal:", error.message);
    }
}

const deuCerto = 200;
const deuRuim = 404;

const htmlLocalhost =  ` <html>
        <head>
          <title>Star Wars API</title>
          <style>
            body { font-family: Arial; max-width: 800px; margin: 0 auto; padding: 20px; }
            h1 { color: #0066cc; }
            button { padding: 10px; background: #0066cc; color: white; border: none; cursor: pointer; }
          </style>
        </head>
        <body>
          <h1>Star Wars API Demo</h1>
          <p>Clique no botão para buscar dados</p>
          <button onclick="fetchData()">Buscar Dados</button>
          <div id="result"></div>
          <script>
            function fetchData() {
              fetch('/api')
                .then(response => response.text())
                .then(text => {
                  document.getElementById('result').innerHTML = '<p>Dados buscados! Veja o console do servidor.</p>';
                })
                .catch(err => {
                  document.getElementById('result').innerHTML = '<p>Erro: ' + err.message + '</p>';
                });
            }
          </script>
        </body>
      </html>`;

const server = http.createServer(async (req, res) => {
    if (req.url === "/") {
        res.writeHead(deuCerto, { "Content-Type": "text/html" });
        res.end(htmlLocalhost);
    } else if (req.url === "/api") {
        await main();
        res.end("Dados buscados! Veja o console do servidor.");
    } else {
        res.writeHead(deuRuim);
        res.end("Página não encontrada");
    }
});


server.listen(config.port, () => {
    console.log(`Servidor rodando em http://localhost:${config.port}`);
    console.log("Pressione Ctrl+C para encerrar");
  
    if (config.debug) {
        console.log("\nModo debug ativado");
        console.log(`Timeout: ${config.timeout}ms`);
    }
});


if (require.main === module) {
    main();
}
