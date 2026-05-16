START TRANSACTION;

-- USERS
INSERT INTO `users` (`id`,`email`,`username`,`password`,`role`,`is_suspended`) VALUES
(1,'user1@example.com','PlayerOne','$2y$12$y28jNm1QIKlcE4/syOeI5OxAvDZUinhgVXTcqQP1e41gLipUQVezy','player',0),
(2,'user2@example.com','PlayerTwo','$2y$12$4TT0y1JWafYrg7MkUeXoe.MnwGZ1JTKIje/tAUiGohGgnuQ8AVIXW','player',0),
(3,'employee1@example.com','EmployeeOne','$2y$12$OykKWTh9yHj1wgSmc.V.z.WDgJwyCCbj1U2yBhs0DpjgzDjfsNsAK','employee',0),
(4,'admin1@example.com','AdminOne','$2y$12$Q1zaY5t1iqOYOD1kt//BJ.M3q4LuZ.NcJrD8rywOungpjUMiCHZzO','admin',0);

-- ACCESSORIES
INSERT INTO `accessories` (`id`,`name`,`type`,`is_active`) VALUES
(1,'Épée en bois','weapon',1),
(2,'Bouclier léger','armor',1),
(3,'Cape rouge','clothing',1),
(4,'Anneau magique','other',1);

-- CHARACTERS
INSERT INTO `characters`
(`id`,`user_id`,`name`,`gender`,`skin_color`,`hair_color`,`eye_color`,
`eye_shape`,`nose_shape`,`mouth_shape`,`face_shape`,
`status`,`rejection_reason`,`is_shared`) VALUES
(1,1,'Arthas','male','clair','blond','bleu','ovale','droit','fin','ovale','approved',NULL,1),
(2,1,'Lyra','female','marron','noir','vert','rond','petit','souriant','rond','approved',NULL,0),
(3,2,'Thorin','male','pâle','brun','gris','carré','grand','serré','carré','pending',NULL,1);

-- CHARACTER_ACCESSORIES
INSERT INTO `character_accessories` (`character_id`,`accessory_id`) VALUES
(1,1),(1,2),(2,3),(3,1),(3,4);

-- COMMENTS
INSERT INTO `comments`
(`id`,`character_id`,`user_id`,`rating`,`comment`,`status`) VALUES
(1,1,2,5,'Super personnage !','approved'),
(2,2,1,4,'Jolie création.','approved'),
(3,3,1,3,'Peut mieux faire.','pending');

-- CONTACT REQUESTS
INSERT INTO `contact_requests`
(`id`,`email`,`username`,`message`,`status`) VALUES
(1,'user1@example.com','PlayerOne','Problème de connexion.','processed'),
(2,'visitor@example.com','GuestUser','Question sur le jeu.','pending');

-- PASSWORD RESETS
INSERT INTO `password_resets`
(`id`,`user_id`,`token`,`expires_at`,`is_used`) VALUES
(1,1,'securetoken123','2026-12-31 23:59:59',0);

-- DELETE REQUESTS
INSERT INTO `delete_requests`
(`id`,`user_id`,`status`) VALUES
(1,2,'pending');

-- LOGS
INSERT INTO `logs`
(`id`,`user_id`,`action`,`target_type`,`target_id`) VALUES
(1,4,'Validation personnage','character',1),
(2,3,'Validation commentaire','comment',1),
(3,4,'Ajout accessoire','accessory',4);
COMMIT;