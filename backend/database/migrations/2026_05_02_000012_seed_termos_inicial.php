<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration {
    public function up(): void {
        if (DB::table("termos")->exists()) return;

        $conteudo = <<<MD
# Termos e Condições de Utilização — Educajá

**Versão 1.0** · Em vigor desde 1 de Maio de 2026.

## 1. Objecto

A Educajá ("nós", "Plataforma") fornece um sistema de gestão escolar SaaS (Software as a Service) acessível via web e aplicações móveis às instituições de ensino ("Cliente", "Escola") que adiram à Plataforma e aceitem os presentes Termos.

## 2. Adesão e Activação

2.1. A adesão à Plataforma faz-se pela inscrição online em educaja.ao, com escolha de um plano e pagamento da primeira mensalidade quando aplicável.

2.2. A conta da Escola fica activa após confirmação do pagamento e provisionamento técnico pela equipa Educajá. Para planos com período de teste, a activação ocorre logo após o registo.

2.3. O Cliente é responsável pela veracidade dos dados fornecidos no acto de inscrição (NIF, morada, contactos do administrador) e por mantê-los actualizados.

## 3. Planos, Preços e Pagamento

3.1. Os preços, limites e funcionalidades de cada plano estão publicados em educaja.ao/precos e podem ser actualizados a qualquer momento. Alterações de preço só entram em vigor no ciclo de facturação seguinte ao da comunicação.

3.2. As facturas são emitidas mensalmente, com vencimento no dia configurado pela Escola (por defeito, dia 5 de cada mês).

3.3. O pagamento pode ser feito por referência Multicaixa, transferência bancária ou outro meio aceite pela Educajá. O atraso superior a 30 dias autoriza a Educajá a suspender o acesso à Plataforma sem aviso prévio adicional.

3.4. Os valores são em Kwanzas (AOA) e incluem IVA à taxa legal em vigor (14% à data da publicação).

## 4. Obrigações do Cliente

4.1. Utilizar a Plataforma apenas para fins legais e de acordo com a finalidade prevista — gestão pedagógica e administrativa da instituição de ensino.

4.2. Garantir que os dados pessoais introduzidos (alunos, encarregados, professores) cumprem a Lei n.º 22/11 de 17 de Junho — Lei da Protecção de Dados Pessoais. O Cliente é o Responsável pelo Tratamento; a Educajá actua como Subcontratante.

4.3. Manter a confidencialidade das credenciais dos seus utilizadores. A Educajá não se responsabiliza por acessos não autorizados resultantes de partilha indevida de passwords.

4.4. Não tentar copiar, descompilar, fazer engenharia inversa ou redistribuir a Plataforma.

## 5. Obrigações da Educajá

5.1. Disponibilizar a Plataforma com uma disponibilidade alvo de 99% em cada mês civil, exceptuando manutenções programadas e eventos de força maior.

5.2. Implementar medidas técnicas e organizativas adequadas à protecção dos dados, incluindo cópias de segurança diárias e cifração em trânsito (HTTPS/TLS).

5.3. Notificar o Cliente em caso de violação de dados pessoais que afecte a sua escola, no prazo legalmente exigido.

5.4. Permitir ao Cliente exportar a totalidade dos seus dados a qualquer momento, em formato estruturado.

## 6. Propriedade dos Dados

6.1. Os dados introduzidos pela Escola na Plataforma (alunos, notas, pagamentos, etc.) são propriedade exclusiva da Escola.

6.2. Após o cancelamento da subscrição, a Escola dispõe de 90 dias para exportar os dados. Após esse período, a Educajá poderá apagar definitivamente a base de dados associada.

## 7. Certificação Fiscal AGT

7.1. A Educajá detém certificação fiscal junto da AGT (Administração Geral Tributária) ao abrigo do Decreto Presidencial n.º 74/17, válida para todas as escolas que utilizem a Plataforma para emissão de documentos fiscais.

7.2. O Cliente compromete-se a não modificar os documentos fiscais gerados pela Plataforma e a entregar à AGT os ficheiros SAFT-AO produzidos sempre que solicitado.

## 8. Limitação de Responsabilidade

8.1. A Plataforma é fornecida "como está". A Educajá não garante que esteja livre de erros ou que satisfaça necessidades específicas não contratadas.

8.2. A responsabilidade total da Educajá perante o Cliente, por qualquer reclamação relativa à Plataforma, é limitada ao montante pago pelo Cliente nos 12 meses anteriores ao facto gerador.

## 9. Cancelamento

9.1. O Cliente pode cancelar a subscrição a qualquer momento, com efeitos no fim do mês corrente.

9.2. A Educajá pode cancelar a subscrição em caso de incumprimento grave destes Termos, mediante notificação prévia de 15 dias.

## 10. Alterações aos Termos

10.1. Estes Termos podem ser alterados pela Educajá. A versão em vigor estará sempre publicada em educaja.ao/termos e identificada por número de versão.

10.2. Alterações materiais serão comunicadas ao Cliente por email com 30 dias de antecedência. A continuação do uso da Plataforma após a entrada em vigor das alterações implica aceitação tácita.

## 11. Lei Aplicável e Foro

11.1. Estes Termos regem-se pela legislação angolana.

11.2. Para a resolução de qualquer litígio é competente o foro da Comarca de Benguela, com renúncia expressa a qualquer outro.

## 12. Contactos

Para questões sobre estes Termos, contacte-nos em **contact@educaja.ao** ou pelos meios disponíveis em educaja.ao/contacto.

---

*Educajá · Benguela, Angola · {ano}*
MD;
        $conteudo = str_replace("{ano}", (string) date("Y"), $conteudo);

        DB::table("termos")->insert([
            "versao"       => "1.0",
            "titulo"       => "Termos e Condições — Educajá",
            "conteudo"     => $conteudo,
            "publicado"    => true,
            "publicado_em" => now(),
            "created_at"   => now(),
            "updated_at"   => now(),
        ]);
    }

    public function down(): void {
        DB::table("termos")->where("versao", "1.0")->delete();
    }
};
