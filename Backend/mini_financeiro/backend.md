Criar ENTIDADES + TABELAS SQL  (Já estão criadas)
Passe para o seguinte;
Lembra de criar tudo em inglês para ficar padrão;
No momento crie apenas o bakcend;
Crie a entities com as tabelas em resources/tables/tables.sql
________________________________________
PROMPT
Objetivo: gerar as entidades Java + scripts SQL das tabelas de créditos do sistema SAS MemorialPro.
Instruções para o modelo:
Crie o módulo de créditos seguindo exatamente a estrutura abaixo.
O sistema é simples e independente do SIGEVE.
Tabelas necessárias
1.	tab_user_credits
      •	id (UUID PK)
      •	user_id (UUID)
      •	total_credits (int)
      •	created_at (timestamp)
      •	updated_at (timestamp)
2.	tab_credit_transactions
      •	id (UUID PK)
      •	user_id (UUID)
      •	type (enum: PURCHASE, USE)
      •	amount (int)
      •	description (text)
      •	created_at (timestamp)
3.	tab_credit_purchases
      •	id (UUID PK)
      •	user_id (UUID)
      •	amount_reais (decimal)
      •	credits_purchased (int)
      •	payment_provider (varchar)
      •	status (enum: PENDING, PAID, FAILED)
      •	created_at (timestamp)
      Regras
      •	Usar padrão UUID.
      •	Criar entities JPA completas, baseadas em @Entity, @Table, @Id, @Column.
      •	Usar @Enumerated(EnumType.STRING) nos enums.
      •	Seguir padrão Java 17 + Spring Boot 3.4.x + Lombok.
      •	Criar enums separados para os dois tipos:
      o	CreditTransactionType
      o	CreditPurchaseStatus
      •	Criar relacionamentos somente via UUID (sem @ManyToOne).
      Saída esperada
1.	Script SQL completo das 3 tabelas
2.	Entities Java completas
3.	Enums completos
4.	Regras importantes documentadas em comentários
________________________________________
Cole esse prompt no Claude e ele vai gerar o data layer completo.
________________________________________
Criar SERVICE de Créditos
Use este prompt quando quiser gerar o service.
________________________________________
Objetivo: criar o service do módulo de créditos, completamente funcional, usando Spring Boot.
Crie uma classe CreditService que implemente as seguintes funções:
Funções obrigatórias
1.	boolean hasEnoughCredits(UUID userId, int requiredCredits)
2.	void consumeCredits(UUID userId, int amount)
3.	void addCredits(UUID userId, int amount, String description)
4.	UserCredits getBalance(UUID userId)
5.	List<CreditTransaction> listTransactions(UUID userId)
6.	CreditPurchase startPurchase(UUID userId, int credits, BigDecimal amountReais)
7.	void confirmPurchase(UUID purchaseId)
8.	void failPurchase(UUID purchaseId)
      Regras
      •	Usar repositórios JPA.
      •	Validar saldo antes de consumir.
      •	Registrar transação sempre que adicionar ou consumir créditos.
      •	Atualizar tab_user_credits corretamente.
      •	Criar métodos privados auxiliares quando necessário.
      •	Lançar exceções customizadas:
      o	NotEnoughCreditsException
      o	PurchaseNotFoundException
      o	InvalidPurchaseStateException
      Saída esperada
      •	Classe completa do service
      •	Exceções
      •	Comentários explicando cada operação
________________________________________
Criar CONTROLLER REST
Use este prompt para gerar os endpoints.
________________________________________
PROMPT
Crie um controller REST chamado CreditController com os seguintes endpoints:
Endpoints
1.	GET /api/credits/balance
      → retorna saldo do usuário logado
2.	GET /api/credits/transactions
      → lista transações do usuário
3.	POST /api/credits/purchase/start
      Body: { "credits": 100, "amountReais": 50.00 }
      → inicia uma compra
4.	POST /api/credits/purchase/confirm/{id}
      → confirma compra (será chamado pelo webhook do gateway de pagamento)
5.	POST /api/credits/purchase/fail/{id}
      → marca compra como falha
      Regras
      •	Usar AuthUtils.getCurrentUserId() igual seu sistema.
      •	Retornar DTOs, não Entities.
      •	Criar os DTOs necessários:
      o	CreditBalanceDTO
      o	CreditTransactionDTO
      o	CreditPurchaseRequestDTO
      o	CreditPurchaseResponseDTO
      •	Usar @PreAuthorize("hasRole('USER') or hasRole('ADMIN')")
      Saída esperada
      •	Controller completo
      •	DTOs completos
      •	Mappers opcionais
________________________________________
Travar geração de memorial quando não houver créditos
________________________________________
PROMPT
Adapte o serviço que gera memorial para consumir créditos antes da IA.
Regra
Antes de chamar GPT/Claude:
if (!creditService.hasEnoughCredits(userId, requiredCredits))
throw new NotEnoughCreditsException("Créditos insuficientes.");

creditService.consumeCredits(userId, requiredCredits);
Instruções
•	Gere uma versão final do método generateMemorial(...) com integração nativa ao CreditService.
•	O valor de créditos deve ser variável:
o	1 lote → 1 crédito
o	até 5 lotes → 3 créditos
o	desmembramento completo → 10 créditos
•	Criar método auxiliar:
int calculateRequiredCredits(PolygonData polygon);

