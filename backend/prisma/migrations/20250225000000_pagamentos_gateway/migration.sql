-- Integração com gateway de pagamento: referência do provedor, resposta da API e status de webhook
ALTER TABLE "pagamentos" ADD COLUMN IF NOT EXISTS "provider_reference" VARCHAR(255);
ALTER TABLE "pagamentos" ADD COLUMN IF NOT EXISTS "gateway_response" JSONB;
ALTER TABLE "pagamentos" ADD COLUMN IF NOT EXISTS "status_webhook" VARCHAR(100);

COMMENT ON COLUMN "pagamentos"."provider_reference" IS 'ID ou referência da transação no gateway (ex: Stripe payment_intent_id)';
COMMENT ON COLUMN "pagamentos"."gateway_response" IS 'Resposta bruta ou parseada da API do gateway (JSON)';
COMMENT ON COLUMN "pagamentos"."status_webhook" IS 'Último status recebido via webhook (ex: approved, pending, refused)';
