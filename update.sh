#!/bin/bash

# Script de atualização automática do bot
# Autor: Dev Gui
# Versão: 0.9.0-BETA

set -e 

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m'

print_color() {
    local color=$1
    local message=$2
    echo -e "${color}${message}${NC}"
}

print_header() {
    echo
    print_color $CYAN "=================================="
    print_color $CYAN "$1"
    print_color $CYAN "=================================="
    echo
}

ask_yes_no() {
    local question=$1
    while true; do
        read -p "$(echo -e "${YELLOW}${question} (s/n): ${NC}")" yn
        case $yn in
            [SsYy]* ) return 0;;
            [NnNn]* ) return 1;;
            * ) echo "Por favor, responda s (sim) ou n (não).";;
        esac
    done
}

check_git_repo() {
    if ! git rev-parse --git-dir > /dev/null 2>&1; then
        print_color $RED "❌ Erro: Este diretório não é um repositório Git!"
        print_color $YELLOW "💡 Dica: Execute este script na pasta raiz do seu projeto."
        exit 1
    fi
}

check_package_json() {
    if [ ! -f "package.json" ]; then
        print_color $RED "❌ Erro: package.json não encontrado!"
        print_color $YELLOW "💡 Dica: Execute este script na pasta raiz do projeto onde está o package.json."
        exit 1
    fi
}

get_version() {
    local file=$1
    if [ -f "$file" ]; then
        node -pe "JSON.parse(require('fs').readFileSync('$file', 'utf8')).version" 2>/dev/null || echo "não encontrada"
    else
        echo "não encontrada"
    fi
}

check_remote() {
    if ! git remote get-url origin > /dev/null 2>&1; then
        print_color $RED "❌ Erro: Remote 'origin' não configurado!"
        print_color $YELLOW "💡 Configure o remote com: git remote add origin <URL_DO_REPOSITORIO>"
        exit 1
    fi
}

create_backup() {
    local backup_dir="backup_$(date +%Y%m%d_%H%M%S)"
    print_color $BLUE "📦 Criando backup das alterações locais em: $backup_dir"
    
    mkdir -p "$backup_dir"
    
    git status --porcelain | while read status file; do
        if [[ "$status" == " M" ]] || [[ "$status" == "M " ]] || [[ "$status" == "MM" ]]; then
            mkdir -p "$backup_dir/$(dirname "$file")" 2>/dev/null || true
            cp "$file" "$backup_dir/$file" 2>/dev/null || true
            print_color $GREEN "  ✅ Backup criado para: $file"
        fi
    done
    
    echo "backup_dir=$backup_dir" > .update_backup_info
    print_color $GREEN "✅ Backup completo!"
}

show_file_differences() {
    print_color $BLUE "🔍 Verificando diferenças entre seu bot e o oficial..."
    
    git fetch origin
    
    local current_branch=$(git branch --show-current)
    local remote_branch="origin/$current_branch"
    
    if ! git show-ref --verify --quiet refs/remotes/$remote_branch; then
        print_color $YELLOW "⚠️  Branch remota '$remote_branch' não encontrada. Usando origin/main ou origin/master..."
        if git show-ref --verify --quiet refs/remotes/origin/main; then
            remote_branch="origin/main"
        elif git show-ref --verify --quiet refs/remotes/origin/master; then
            remote_branch="origin/master"
        else
            print_color $RED "❌ Não foi possível encontrar uma branch remota válida!"
            exit 1
        fi
    fi
    
    echo "remote_branch=$remote_branch" >> .update_backup_info
    
    local new_files=$(git diff --name-only HEAD..$remote_branch --diff-filter=A)
    if [ ! -z "$new_files" ]; then
        print_color $GREEN "📁 Arquivos NOVOS que serão baixados:"
        echo "$new_files" | while read file; do
            print_color $GREEN "  + $file"
        done
        echo
    fi
    
    local deleted_files=$(git diff --name-only HEAD..$remote_branch --diff-filter=D)
    if [ ! -z "$deleted_files" ]; then
        print_color $RED "🗑️ Arquivos que foram REMOVIDOS no bot oficial:"
        echo "$deleted_files" | while read file; do
            print_color $RED "  - $file"
        done
        echo
        if ask_yes_no "⚠️  Deseja DELETAR estes arquivos localmente também?"; then
            echo "delete_files=yes" >> .update_backup_info
        else
            echo "delete_files=no" >> .update_backup_info
        fi
        echo
    fi
    
    local modified_files=$(git diff --name-only HEAD..$remote_branch --diff-filter=M)
    if [ ! -z "$modified_files" ]; then
        print_color $YELLOW "✏️ Arquivos MODIFICADOS que serão atualizados:"
        echo "$modified_files" | while read file; do
            print_color $YELLOW "  ~ $file"
        done
        echo
    fi
    
    local conflicted_files=""
    if [ ! -z "$modified_files" ]; then
        echo "$modified_files" | while read file; do
            if git diff --quiet HEAD "$file" 2>/dev/null; then
                continue
            else
                echo "$file" >> .potential_conflicts
            fi
        done
        
        if [ -f .potential_conflicts ]; then
            conflicted_files=$(cat .potential_conflicts)
            rm .potential_conflicts
        fi
    fi
    
    if [ ! -z "$conflicted_files" ]; then
        print_color $PURPLE "⚠️  ATENÇÃO: Os seguintes arquivos foram modificados TANTO localmente QUANTO remotamente:"
        echo "$conflicted_files" | while read file; do
            print_color $PURPLE "  ⚠️  $file"
        done
        print_color $YELLOW "🔧 Será usado o merge strategy 'ort' para tentar mesclar automaticamente."
        echo
    fi
}

apply_updates() {
    source .update_backup_info
    
    print_color $BLUE "🔄 Aplicando atualizações..."
    
    git config merge.ours.driver true
    git config pull.rebase false
    
    print_color $YELLOW "🔧 Usando estratégia de merge 'ort' para mesclar alterações..."
    
    if git merge -X ort $remote_branch --no-commit --no-ff 2>/dev/null; then
        print_color $GREEN "✅ Merge automático realizado com sucesso!"
        
        if [[ "${delete_files:-no}" == "yes" ]]; then
            git diff --name-only HEAD..$remote_branch --diff-filter=D | while read file; do
                if [ -f "$file" ]; then
                    rm "$file"
                    git add "$file"
                    print_color $GREEN "  🗑️ Arquivo deletado: $file"
                fi
            done
        fi
        
        git commit -m "🤖 Atualização automática via script update.sh" 2>/dev/null || {
            print_color $YELLOW "ℹ️ Nenhuma alteração para commit (já estava atualizado)"
        }
        
    else
        print_color $RED "❌ Não foi possível fazer merge automático!"
        
        git merge --abort 2>/dev/null || true
        
        print_color $YELLOW "🔍 Verificando arquivos com conflito..."
        
        local conflicted=$(git diff --name-only HEAD $remote_branch)
        
        print_color $RED "⚠️  Os seguintes arquivos têm conflitos que precisam ser resolvidos manualmente:"
        echo "$conflicted" | while read file; do
            print_color $RED "  ⚠️  $file"
        done
        
        echo
        print_color $YELLOW "💡 O que fazer agora:"
        print_color $YELLOW "  1. Aceitar TODAS as alterações do repositório do bot oficial (sobrescrever local)"
        print_color $YELLOW "  2. Manter TODAS as alterações locais (ignorar repositório do bot oficial)" 
        print_color $YELLOW "  3. Resolver conflitos manualmente depois"
        echo
        
        echo "Escolha uma opção:"
        echo "1) Aceitar tudo do bot oficial (CUIDADO: vai sobrescrever suas alterações!)"
        echo "2) Manter tudo local (não vai atualizar)"
        echo "3) Cancelar e resolver manualmente"
        
        read -p "Opção (1-3): " choice
        
        case $choice in
            1)
                print_color $YELLOW "⚠️  ATENÇÃO: Suas alterações locais serão PERDIDAS!"
                if ask_yes_no "Tem CERTEZA que quer continuar?"; then
                    git reset --hard $remote_branch
                    print_color $GREEN "✅ Repositório atualizado com versão remota!"
                else
                    print_color $BLUE "ℹ️ Operação cancelada."
                    return 1
                fi
                ;;
            2)
                print_color $BLUE "ℹ️ Mantendo alterações locais. Repositório não foi atualizado."
                return 1
                ;;
            3)
                print_color $BLUE "ℹ️ Operação cancelada. Resolva os conflitos manualmente."
                print_color $YELLOW "💡 Use: git merge $remote_branch"
                return 1
                ;;
            *)
                print_color $RED "❌ Opção inválida!"
                return 1
                ;;
        esac
    fi
}

cleanup() {
    rm -f .update_backup_info .potential_conflicts
}

main() {
    print_header "🤖 SCRIPT DE ATUALIZAÇÃO TAKESHI BOT"
    
    print_color $BLUE "🔍 Verificando ambiente..."
    
    check_git_repo
    check_package_json
    check_remote
    
    print_color $CYAN "📊 INFORMAÇÕES DE VERSÃO:"
    local local_version=$(get_version "package.json")
    
    git fetch origin 2>/dev/null || {
        print_color $RED "❌ Erro ao conectar com o repositório do bot oficial!"
        print_color $YELLOW "💡 Verifique sua conexão de internet e as permissões do repositório."
        exit 1
    }
    
    local current_branch=$(git branch --show-current)
    local remote_branch="origin/$current_branch"
    
    if ! git show-ref --verify --quiet refs/remotes/$remote_branch; then
        if git show-ref --verify --quiet refs/remotes/origin/main; then
            remote_branch="origin/main"
        elif git show-ref --verify --quiet refs/remotes/origin/master; then
            remote_branch="origin/master"
        fi
    fi
    
    local remote_version="não encontrada"
    if git show $remote_branch:package.json > /tmp/remote_package.json 2>/dev/null; then
        remote_version=$(get_version "/tmp/remote_package.json")
        rm -f /tmp/remote_package.json
    fi
    
    print_color $([ "$local_version" = "$remote_version" ] && echo $GREEN || echo $RED) "  📦 Sua versão:     $local_version"
    print_color $GREEN "  🌐 Versão oficial: $remote_version"
    echo
    
    if ! git diff-index --quiet HEAD --; then
        print_color $YELLOW "⚠️   Você tem alterações locais não salvas!"
        if ask_yes_no "Deseja criar um backup das suas alterações antes de continuar?"; then
            create_backup
        fi
        echo
    fi
    
    if git diff --quiet HEAD $remote_branch 2>/dev/null; then
        print_color $GREEN "✅ Seu bot já está ATUALIZADO!"
        print_color $BLUE "ℹ️  Não há nada para baixar."
        cleanup
        exit 0
    fi
    
    show_file_differences
    
    if ask_yes_no "🚀 Deseja APLICAR todas essas atualizações?"; then
        apply_updates
        
        if [ $? -eq 0 ]; then
            print_color $GREEN "✅ ATUALIZAÇÃO CONCLUÍDA COM SUCESSO!"
            
            local new_version=$(get_version "package.json")
            if [ "$new_version" != "$local_version" ]; then
                print_color $CYAN "🎉 Versão atualizada: $local_version → $new_version"
            fi
            
            print_color $YELLOW "💡 PRÓXIMOS PASSOS:"
            print_color $YELLOW "  1. Verifique se tudo está funcionando corretamente"
            print_color $YELLOW "  2. Execute 'npm install' se houver novas dependências"
            print_color $YELLOW "  3. Reinicie o bot se necessário"
            
            if [ -f .update_backup_info ]; then
                source .update_backup_info
                if [ ! -z "${backup_dir:-}" ] && [ -d "$backup_dir" ]; then
                    print_color $BLUE "📦 Backup das suas alterações salvo em: $backup_dir"
                fi
            fi
        else
            print_color $RED "❌ Atualização não foi completada."
            print_color $YELLOW "💡 Verifique os erros acima e tente novamente."
        fi
    else
        print_color $BLUE "ℹ️  Atualização cancelada pelo usuário."
    fi
    
    cleanup
    print_color $CYAN "🏁 Script finalizado!"
}

trap cleanup EXIT INT TERM

main "$@"
