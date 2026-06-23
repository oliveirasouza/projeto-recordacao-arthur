# Context7 MCP Server Setup

## 🚀 Instalação Rápida

### 1. Copie a API Key para `.env.local`

```bash
# Renomeie .env.example localmente e edite:
cp next-monorepo/.env.local.example next-monorepo/.env.local

# Adicione sua chave real em next-monorepo/.env.local
echo "CONTEXT7_API_KEY=ctx7sk-[sua-chave-completa]" > next-monorepo/.env.local
```

### 2. Configure seu IDE (VS Code / Antigravity)

**Settings JSON (`settings.json`):**

Adicione no `.vscode/settings.json`:

```jsonc
{
    "mcp.servers": {
        "context7-api": {
            "command": "${workspaceFolder}/next-monorepo/mcp-server-context7.json",
            "args": ["--config-file-name=${workspaceFolder}", "env_file="${workspaceFolder}/.env.local"],
            "cwd": null,
            "transportType": "http"
        }
    },
    "$schema": "https://raw.githubusercontent.com/microsoft/vscode-mcp/main/schemas/protocol.json",
    "mcp.servers.context7-api.args.env_file": "${workspaceFolder}/.env.local"
}
```

**Ou via GUI de settings (MCP):**  
1. Abrir `Settings` → Search: *"MCP Servers"*
2. Adicionar novo server com config acima em `"settings.json"`


### 3. Use na sua CLI/Projects Next.js

Agora pode usar o Context7 MCP direto no seu workspace! Exemplos de uso prático para projetos Vercel/Next.js que você tem:

```bash
# Buscar rotas/vias dentro do projeto (routing):
curl "https://context7.com/api/v2/context?libraryId=/vercel/next.js&query=routing" \
  -H "Authorization: Bearer $(cat .env.local | grep CONTEXT7_API_KEY)"


## 📖 Funcionalidades Disponíveis

### Ferramentas Principais do Context7 MCP:

| Tool               | Descrição                                           | Exemplo de uso                              |
|--------------------|-----------------------------------------------------|---------------------------------------------|
| `semantic_search`  | Busca semântica por contextos históricos            | "Como implementar lazy loading neste app?"  |
| `context_analysis` | Análise profunda com histórico                      | Qual contexto usar para otimização          |
| `code_generation`  | Geração assistida baseada no contexto               | Gerar hooks de React baseado em componentes existentes           |


### Exemplo Prático: Análise semântica do seu projeto Next.js

```bash
# No terminal, dentro next-monorepo/ :
CONTEXT7_API_KEY=ctx7sk-*** ./mcp-server-context7.json --libraryId=/vercel/next.js \
--query="como usar app router routing"


## 📝 Documentação da API Context7

Endpoint oficial do provider: **https://context7.com/api/v2/context**

### Headers de autenticação obrigatórios para todas as requisições MCP:

| Header            | Valor                                          | Obrigatório |
|-------------------|------------------------------------------------|-------------|
| `Authorization`   | `Bearer ${CONTEXT7_API_KEY}`                   | ✅ SIM      |


## ⚠️ Segurança Importante!

- ❌ **NÃO** versionar `.env.local`, `.env.development.local` ou arquivos com API keys na Git  
- 🔐 Use gitignore: adicione no `.gitignore`:
  ```bash
  echo ".env.*" >> .gitignore
  npm run lint
  
# Adicionar ao .vscode/settings.json para evitar versionamento de chaves