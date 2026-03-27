-- Tarifs livraison (démo) : Djibouti 3 €, International 20 €
UPDATE "ShippingZone" SET price = 3 WHERE code = 'DJ';
UPDATE "ShippingZone" SET price = 20 WHERE code = 'INT';
