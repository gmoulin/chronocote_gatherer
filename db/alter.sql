ALTER TABLE `candidate` ADD (
	`validated_estimation` VARCHAR( 255 ) CHARACTER SET utf8 COLLATE utf8_general_ci NULL,
	`validated_title` VARCHAR( 255 ) CHARACTER SET utf8 COLLATE utf8_general_ci NULL,
	`validated_description` TEXT CHARACTER SET utf8 COLLATE utf8_general_ci NULL,
	`validated_image` VARCHAR( 25 ) CHARACTER SET utf8 COLLATE utf8_general_ci NULL
);
