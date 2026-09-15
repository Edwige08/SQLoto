-- sql/002_create_readonly_role.sql
--
-- Rôle dédié à l'exécution des requêtes générées par le chatbot.
-- Aucun droit d'écriture, aucune raison qu'il en ait besoin.
-- À exécuter une seule fois dans l'éditeur SQL de Neon (avec un rôle admin).

CREATE ROLE chatbot_readonly WITH LOGIN;

-- Définir ensuite un mot de passe directement dans Neon, sans l'ajouter à ce fichier :
-- ALTER ROLE chatbot_readonly PASSWORD '<mot-de-passe-généré-dans-Neon>';

GRANT CONNECT ON DATABASE neondb TO chatbot_readonly; -- adapte "neondb" si ta base a un autre nom
GRANT USAGE ON SCHEMA public TO chatbot_readonly;
GRANT SELECT ON tirages TO chatbot_readonly;

-- Si une nouvelle table est ajoutée plus tard, il faudra lui accorder
-- explicitement SELECT à ce rôle : il n'a AUCUN droit par défaut sur
-- les futures tables, ce qui est le comportement voulu (liste blanche
-- appliquée aussi au niveau base de données, pas seulement dans le code).
