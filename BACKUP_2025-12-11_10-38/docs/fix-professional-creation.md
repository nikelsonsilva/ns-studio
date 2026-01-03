# 🔧 Correção: Criação de Profissionais

## ❌ Problema Identificado

A tabela `professionals` no Supabase não tinha todos os campos necessários:
- ❌ `monthly_goal` (Meta Mensal)
- ❌ `buffer_minutes` (Intervalo)
- ❌ `custom_buffer` (Buffer Customizado)
- ❌ `email` (Email)
- ❌ `phone` (Telefone)

## ✅ Solução

### 1. Execute a Migration no Supabase

Abra o **SQL Editor** no Supabase e execute:

[`migration_complete_professionals.sql`](file:///c:/Users/nikel/Desktop/APP%20ns-studio/supabase/migration_complete_professionals.sql)

```sql
ALTER TABLE professionals ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE professionals ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE professionals ADD COLUMN IF NOT EXISTS commission_rate NUMERIC(5,2) DEFAULT 50.00;
ALTER TABLE professionals ADD COLUMN IF NOT EXISTS monthly_goal NUMERIC(10,2) DEFAULT 5000.00;
ALTER TABLE professionals ADD COLUMN IF NOT EXISTS buffer_minutes INTEGER DEFAULT 15;
ALTER TABLE professionals ADD COLUMN IF NOT EXISTS custom_buffer BOOLEAN DEFAULT false;
ALTER TABLE professionals ADD COLUMN IF NOT EXISTS specialty TEXT;
ALTER TABLE professionals ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
```

### 2. Código Atualizado

O `ProfessionalModal.tsx` agora envia **todos os campos**:

```typescript
const dataToSend = {
    name: formData.name,
    specialty: formData.specialty,
    commission_rate: formData.commission_rate,
    monthly_goal: formData.monthly_goal,      // ✅ Adicionado
    buffer_minutes: formData.buffer_minutes,  // ✅ Adicionado
    custom_buffer: formData.custom_buffer,    // ✅ Adicionado
    is_active: true,
    business_id: businessId,
    email: formData.email,                    // ✅ Adicionado
    phone: formData.phone,                    // ✅ Adicionado
};
```

### 3. Logs Detalhados

Agora você verá no console:

```
📝 ProfessionalModal: Form data before validation: {...}
🏢 ProfessionalModal: Business ID: xxx
📤 ProfessionalModal: Data to send: {...}
➕ ProfessionalModal: Creating new professional
✅ ProfessionalModal: Professional created: {...}
📅 ProfessionalModal: Saving schedule for professional: xxx
🎉 ProfessionalModal: Success!
```

Se houver erro:

```
❌ ProfessionalModal: Error details: {
    message: "...",
    code: "PGRST204",
    details: "...",
    hint: "...",
    formData: {...},
    stack: "..."
}
```

---

## 🧪 Como Testar

1. **Execute a migration** no Supabase
2. **Recarregue a página** (Ctrl+Shift+R)
3. **Abra o console** (F12)
4. **Tente criar um profissional**
5. **Veja os logs** detalhados

---

## 📋 Campos do Modal vs Banco

| Campo Modal | Campo Banco | Status |
|------------|-------------|--------|
| Nome | `name` | ✅ |
| Email | `email` | ✅ |
| Telefone | `phone` | ✅ |
| Especialidade | `specialty` | ✅ |
| Comissão (%) | `commission_rate` | ✅ |
| Meta Mensal (R$) | `monthly_goal` | ✅ |
| Horários | `professional_availability` (tabela separada) | ✅ |
| Buffer | `buffer_minutes` | ✅ |
| Buffer Customizado | `custom_buffer` | ✅ |

---

**Tudo pronto!** Execute a migration e teste novamente! 🚀
