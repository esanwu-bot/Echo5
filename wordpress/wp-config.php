<?php
/**
 * The base configuration for WordPress
 *
 * The wp-config.php creation script uses this file during the installation.
 * You don't have to use the website, you can copy this file to "wp-config.php"
 * and fill in the values.
 *
 * This file contains the following configurations:
 *
 * * Database settings
 * * Secret keys
 * * Database table prefix
 * * ABSPATH
 *
 * @link https://developer.wordpress.org/advanced-administration/wordpress/wp-config/
 *
 * @package WordPress
 */

// ** Database settings - 与 siteBase 同实例不同 DB（hutian_wordpress）** //
/** The name of the database for WordPress */
define( 'DB_NAME', 'hutian_wordpress' );

/** Database username */
define( 'DB_USER', 'root' );

/** Database password */
define( 'DB_PASSWORD', 'root' );

/** Database hostname（同 siteBase 实例：localhost，PHP mysqli 在 Windows 上走 TCP） */
define( 'DB_HOST', 'localhost' );

/** Database charset to use in creating database tables. */
define( 'DB_CHARSET', 'utf8mb4' );

/** The database collate type. Don't change this if in doubt. */
define( 'DB_COLLATE', '' );

/**#@+
 * Authentication unique keys and salts.
 *
 * Change these to different unique phrases! You can generate these using
 * the {@link https://api.wordpress.org/secret-key/1.1/salt/ WordPress.org secret-key service}.
 *
 * You can change these at any point in time to invalidate all existing cookies.
 * This will force all users to have to log in again.
 *
 * @since 2.6.0
 */
define( 'AUTH_KEY',         ':k92{gUq-.-9}3Kt*yL rz&EM2OaN#+j;,|E87O,,H#HM]afU+o49%nNwRtEBG4X' );
define( 'SECURE_AUTH_KEY',  '--ZX}g9S.[/PeGUN:;NR56XU[6vw+k<+3^,w^0#wI[5m@@n,AT MA[E8llmZzwoT' );
define( 'LOGGED_IN_KEY',    '?7G`%Q|HG(2%c )T2+te^WTWla-lRvCZLcoVM;Vp?d=L*v1w<MeonT/D(omT%W0l' );
define( 'NONCE_KEY',        'An7TL7]u.3K,;<96%sdAfPEUg!Q|@!*T7{V.mW_@QuTO&jigQ*?9iI6O{HYIE$[;' );
define( 'AUTH_SALT',        '&HD%Jl7MNhDCcVS-xVyc=u#z-T)z@]QVU8V<]UvW!d^8n&b.pLe)qLs$d-X,6W{P' );
define( 'SECURE_AUTH_SALT', 'ZYj@`j_~hR|/?{._1&I&o6wVA(]gxLbP6n+SwEaCc6c+HM<c-G2+;Dc4HVO@h+r]' );
define( 'LOGGED_IN_SALT',   '|*{DDYC^nPI0:/DSaz59L=2Qs/0tH`0hR|-_Y+t!+KA9D-s_}el/YS-QXNp2OZ?p' );
define( 'NONCE_SALT',       'FrJo:co6XEwOpCk881.FL.*C[ljQ|90#4y]<MPht^e8._E:d!5|n=V!W6M(L|+I_' );

/**#@-*/

/**
 * WordPress database table prefix.
 *
 * You can have multiple installations in one database if you give each
 * a unique prefix. Only numbers, letters, and underscores please!
 *
 * At the installation time, database tables are created with the specified prefix.
 * Changing this value after WordPress is installed will make your site think
 * it has not been installed.
 *
 * @link https://developer.wordpress.org/advanced-administration/wordpress/wp-config/#table-prefix
 */
$table_prefix = 'wp_hutian_';

/**
 * For developers: WordPress debugging mode.
 *
 * Change this to true to enable the display of notices during development.
 * It is strongly recommended that plugin and theme developers use WP_DEBUG
 * in their development environments.
 *
 * For information on other constants that can be used for debugging,
 * visit the documentation.
 *
 * @link https://developer.wordpress.org/advanced-administration/debug/debug-wordpress/
 */
define( 'WP_DEBUG', true );
define( 'WP_DEBUG_LOG', true );
define( 'WP_DEBUG_DISPLAY', false );

/* Add any custom values between this line and the "stop editing" line. */



/* That's all, stop editing! Happy publishing. */

/** Absolute path to the WordPress directory. */
if ( ! defined( 'ABSPATH' ) ) {
	define( 'ABSPATH', __DIR__ . '/' );
}

/** Sets up WordPress vars and included files. */
require_once ABSPATH . 'wp-settings.php';
