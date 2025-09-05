import tkinter as tk
import pandas as pd
from tkinter import messagebox

# === Carregar planilha ===
try:
    planilha = 'filipeta_simulada_com_margem.xlsx'
    df_clientes = pd.read_excel(planilha, sheet_name='Clientes')
    df_compras = pd.read_excel(planilha, sheet_name='Compras')
    df_estoque = pd.read_excel(planilha, sheet_name='Estoque')
    df_compat = pd.read_excel(planilha, sheet_name='Regras_Compatibilidade')
except FileNotFoundError:
    messagebox.showerror("Erro", f"Arquivo '{planilha}' não encontrado.")
    exit()

# === Preparar dados ===
clientes = {}
for _, row in df_clientes.iterrows():
    cpf = str(row['CPF']).zfill(11)
    nome = row['Nome']
    produtos = df_compras[df_compras['CPF'].astype(str).str.zfill(11) == cpf]['Produto'].tolist()
    clientes[cpf] = {"nome": nome, "produtos": produtos}


compatibilidade = {}
for _, row in df_compat.iterrows():
    categoria = row['Categoria_Produto']
    compat = [x.strip() for x in row['Produtos_Compatíveis'].split(';')]
    compatibilidade[categoria] = compat

estoque = df_estoque.to_dict('records')

# === Interface ===
janela = tk.Tk()
janela.title("Filipeta de Atendimento Inteligente v2")
janela.geometry("540x480")
janela.configure(bg='#f4f4f4')

# CPF
tk.Label(janela, text="CPF do Cliente:", bg='#f4f4f4', font=('Arial', 12)).pack(pady=5)
entrada_cpf = tk.Entry(janela, font=('Arial', 14))
entrada_cpf.pack(pady=5)

label_nome = tk.Label(janela, text="", font=('Arial', 12), bg='#f4f4f4')
label_nome.pack(pady=5)
label_favoritos = tk.Label(janela, text="", font=('Arial', 11), bg='#f4f4f4', wraplength=500)
label_favoritos.pack(pady=5)

def buscar_cliente():
    cpf = entrada_cpf.get()
    if cpf in clientes:
        nome = clientes[cpf]['nome']
        produtos = clientes[cpf]['produtos']
        label_nome.config(text=f"Cliente: {nome}")
        label_favoritos.config(text="Mais comprados:\n" + "\n".join(produtos))
    else:
        label_nome.config(text="Cliente não encontrado.")
        label_favoritos.config(text="")

# Código de Barras
tk.Label(janela, text="Código de Barras do Produto:", bg='#f4f4f4', font=('Arial', 12)).pack(pady=10)
entrada_codigo = tk.Entry(janela, font=('Arial', 14))
entrada_codigo.pack(pady=5)

label_sugestoes = tk.Label(janela, text="", font=('Arial', 11), bg='#f4f4f4', wraplength=500)
label_sugestoes.pack(pady=5)

def buscar_sugestoes():
    codigo = entrada_codigo.get()
    sugestoes = []

    # Identificar categoria do produto escaneado
    categoria_origem = None
    for item in estoque:
        if str(item['Codigo_Barras']) == codigo:
            categoria_origem = item['Categoria']
            break

    if not categoria_origem:
        label_sugestoes.config(text="Produto não encontrado no estoque.")
        return

    # Buscar categorias compatíveis
    categorias_compat = compatibilidade.get(categoria_origem, [])

    # Filtrar produtos do estoque com categorias compatíveis
    produtos_compat = [item for item in estoque if item['Categoria'] in categorias_compat]

    # Ordenar por margem decrescente e limitar a 10
    produtos_compat.sort(key=lambda x: x['Margem'], reverse=True)
    top_produtos = produtos_compat[:10]

    if top_produtos:
        texto = "Produtos compatíveis sugeridos (ordenados por margem):\n\n"
        for prod in top_produtos:
            texto += f"• {prod['Produto']} (Margem: {int(prod['Margem']*100)}%)\n"
        label_sugestoes.config(text=texto)
    else:
        label_sugestoes.config(text="Nenhum produto compatível disponível.")

# Botões
tk.Button(janela, text="Buscar Cliente", command=buscar_cliente, bg="#4CAF50", fg="white", font=('Arial', 12)).pack(pady=10)
tk.Button(janela, text="Buscar Compatíveis", command=buscar_sugestoes, bg="#2196F3", fg="white", font=('Arial', 12)).pack(pady=5)

janela.mainloop()
