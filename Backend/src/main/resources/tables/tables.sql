
CREATE TABLE tab_user_credits (
                                  user_credits_id UUID PRIMARY KEY,
                                  user_id UUID NOT NULL UNIQUE,
                                  total_credits INTEGER NOT NULL DEFAULT 0,
                                  created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
                                  updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),

                                  CONSTRAINT fk_user_credits_user FOREIGN KEY (user_id)
                                      REFERENCES tab_users (user_id) ON DELETE CASCADE
);
CREATE INDEX idx_user_credits_user_id ON tab_user_credits(user_id);




CREATE TABLE tab_credit_transactions (
                                         credit_transactions_id UUID PRIMARY KEY,
                                         user_id UUID NOT NULL,
                                         type credit_transaction_type NOT NULL,
                                         amount INTEGER NOT NULL,  -- positivo (PURCHASE) ou negativo (USE)
                                         description TEXT,
                                         created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),

                                         CONSTRAINT fk_credit_tx_user FOREIGN KEY (user_id)
                                             REFERENCES tab_users (user_id) ON DELETE CASCADE
);

CREATE INDEX idx_credit_tx_user ON tab_credit_transactions(user_id);



CREATE TABLE tab_credit_purchases (
                                      credit_purchases_id UUID PRIMARY KEY,
                                      user_id UUID NOT NULL,
                                      amount_reais DECIMAL(12,2) NOT NULL,
                                      credits_purchased INTEGER NOT NULL,
                                      payment_provider VARCHAR(50),  -- ex.: PIX, stripe, pagbank
                                      status credit_purchase_status NOT NULL DEFAULT 'PENDING',
                                      created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),

                                      CONSTRAINT fk_credit_purchase_user FOREIGN KEY (user_id)
                                          REFERENCES tab_users (user_id) ON DELETE CASCADE
);

CREATE INDEX idx_credit_purchase_user ON tab_credit_purchases(user_id);

