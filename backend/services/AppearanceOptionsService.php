<?php

class AppearanceOptionsService {
    private const BASE_DIR = __DIR__ . '/../public/uploads/appearance';
    private const ALLOWED_EXTENSIONS = ['png', 'jpg', 'jpeg', 'webp', 'gif'];

    /**
     * Sous-répertoires sous /public/uploads/appearance considérés comme valides.
     *
     * @return string[]
     */
    public static function getAllowedSubDirs(): array {
        return [
            'body-types',
            'hair-styles',
            'eye-types',
            'mouth-types',

            'clothing-head',
            'clothing-top',
            'clothing-legs',
            'clothing-shoes',

            'armor-helmet',
            'armor-chestplate',
            'armor-leggings',
            'armor-boots',
            'gloves-left',
            'gloves-right',

            'hands-left',
            'hands-right',

            'accessories-neck',
            'accessories-finger',
            'accessories-wrist',
            'accessories-waist',
        ];
    }

    /**
     * Retourne les valeurs autorisées par catégorie de personnalisation.
     * Si une catégorie n'a pas encore d'assets créés, elle renverra ['none'].
     */
    public static function getOptions(): array {
        $bodyTypes = self::listKeys('body-types', /*includeNone*/ false);
        if (!in_array('human', $bodyTypes, true)) {
            array_unshift($bodyTypes, 'human');
        }

        return [
            'bodyTypes' => $bodyTypes,
            'hairStyles' => self::listKeys('hair-styles', /*includeNone*/ true),
            'eyeTypes' => self::listKeys('eye-types', /*includeNone*/ true),
            'mouthTypes' => self::listKeys('mouth-types', /*includeNone*/ true),

            'clothing' => [
                'head' => self::listKeys('clothing-head', /*includeNone*/ true),
                'top' => self::listKeys('clothing-top', /*includeNone*/ true),
                'legs' => self::listKeys('clothing-legs', /*includeNone*/ true),
                'shoes' => self::listKeys('clothing-shoes', /*includeNone*/ true),
            ],

            'gloves' => [
                'left' => self::listKeys('gloves-left', /*includeNone*/ true),
                'right' => self::listKeys('gloves-right', /*includeNone*/ true),
            ],

            'armor' => [
                'helmet' => self::listKeys('armor-helmet', /*includeNone*/ true),
                'chestplate' => self::listKeys('armor-chestplate', /*includeNone*/ true),
                'leggings' => self::listKeys('armor-leggings', /*includeNone*/ true),
                'boots' => self::listKeys('armor-boots', /*includeNone*/ true),
                'leftGlove' => self::listKeys('gloves-left', /*includeNone*/ true),
                'rightGlove' => self::listKeys('gloves-right', /*includeNone*/ true),
            ],

            'hands' => [
                'left' => self::listKeys('hands-left', /*includeNone*/ true),
                'right' => self::listKeys('hands-right', /*includeNone*/ true),
            ],

            'accessories' => [
                'neck' => self::listKeys('accessories-neck', /*includeNone*/ true),
                'finger' => self::listKeys('accessories-finger', /*includeNone*/ true),
                'wrist' => self::listKeys('accessories-wrist', /*includeNone*/ true),
                'waist' => self::listKeys('accessories-waist', /*includeNone*/ true),
            ],
        ];
    }

    public static function isAllowed(string $category, ?string $value): bool {
        if ($value === null) return false;

        $options = self::getOptions();

        switch ($category) {
            case 'bodyType':
                return in_array($value, $options['bodyTypes'], true);
            case 'hairStyle':
                return in_array($value, $options['hairStyles'], true);
            case 'eyeType':
                return in_array($value, $options['eyeTypes'], true);
            case 'mouthType':
                return in_array($value, $options['mouthTypes'], true);

            case 'clothingHead':
                return in_array($value, $options['clothing']['head'], true);
            case 'clothingTop':
                return in_array($value, $options['clothing']['top'], true);
            case 'clothingLegs':
                return in_array($value, $options['clothing']['legs'], true);
            case 'clothingShoes':
                return in_array($value, $options['clothing']['shoes'], true);

            case 'armorHelmet':
                return in_array($value, $options['armor']['helmet'], true);
            case 'armorChestplate':
                return in_array($value, $options['armor']['chestplate'], true);
            case 'armorLeggings':
                return in_array($value, $options['armor']['leggings'], true);
            case 'armorBoots':
                return in_array($value, $options['armor']['boots'], true);

            case 'leftGlove':
                return in_array($value, $options['gloves']['left'], true);
            case 'rightGlove':
                return in_array($value, $options['gloves']['right'], true);

            case 'handLeft':
                return in_array($value, $options['hands']['left'], true);
            case 'handRight':
                return in_array($value, $options['hands']['right'], true);

            case 'accessoryNeck':
                return in_array($value, $options['accessories']['neck'], true);
            case 'accessoryFinger':
                return in_array($value, $options['accessories']['finger'], true);
            case 'accessoryWrist':
                return in_array($value, $options['accessories']['wrist'], true);
            case 'accessoryWaist':
                return in_array($value, $options['accessories']['waist'], true);
            default:
                return false;
        }
    }

    /**
     * Retourne tous les éléments uploadés dans toutes les catégories.
     *
     * @return array<int, array{category: string, key: string, file_name: string, image_path: string}>
     */
    public static function getItems(): array {
        $items = [];

        foreach (self::getAllowedSubDirs() as $subDir) {
            $dir = rtrim(self::BASE_DIR, '/\\') . DIRECTORY_SEPARATOR . $subDir;
            if (!is_dir($dir)) {
                continue;
            }

            $entries = scandir($dir);
            if ($entries === false) {
                continue;
            }

            foreach ($entries as $entry) {
                if ($entry === '.' || $entry === '..') continue;

                $fullPath = $dir . DIRECTORY_SEPARATOR . $entry;
                if (!is_file($fullPath)) continue;

                $ext = strtolower(pathinfo($entry, PATHINFO_EXTENSION));
                if (!in_array($ext, self::ALLOWED_EXTENSIONS, true)) continue;

                $key = pathinfo($entry, PATHINFO_FILENAME);
                if ($key === '' || $key === 'none') continue;

                $items[] = [
                    'category' => $subDir,
                    'key' => $key,
                    'file_name' => $entry,
                    'image_path' => '/public/uploads/appearance/' . $subDir . '/' . $entry,
                ];
            }
        }

        usort($items, function ($a, $b) {
            $cat = strcmp($a['category'], $b['category']);
            if ($cat !== 0) return $cat;
            return strcmp($a['key'], $b['key']);
        });

        return $items;
    }

    /**
     * @return string[]
     */
    private static function listKeys(string $subDir, bool $includeNone): array {
        $dir = rtrim(self::BASE_DIR, '/\\') . DIRECTORY_SEPARATOR . $subDir;
        if (!is_dir($dir)) {
            return $includeNone ? ['none'] : [];
        }

        $entries = scandir($dir);
        if ($entries === false) {
            return $includeNone ? ['none'] : [];
        }

        $keys = [];

        foreach ($entries as $entry) {
            if ($entry === '.' || $entry === '..') continue;

            $fullPath = $dir . DIRECTORY_SEPARATOR . $entry;
            if (!is_file($fullPath)) continue;

            $ext = strtolower(pathinfo($entry, PATHINFO_EXTENSION));
            if (!in_array($ext, self::ALLOWED_EXTENSIONS, true)) continue;

            $base = pathinfo($entry, PATHINFO_FILENAME);
            if ($base === '' || $base === 'none') continue;

            $keys[] = $base;
        }

        sort($keys);

        if ($includeNone) {
            array_unshift($keys, 'none');
        }

        return $keys;
    }

    public static function slugify(string $value): string {
        $value = trim($value);
        if ($value === '') return '';

        $value = iconv('UTF-8', 'ASCII//TRANSLIT', $value);
        if ($value === false) {
            $value = '';
        }

        $value = strtolower($value);
        $value = preg_replace('/[^a-z0-9]+/', '-', $value);
        $value = trim($value ?? '', '-');

        return $value;
    }
}
