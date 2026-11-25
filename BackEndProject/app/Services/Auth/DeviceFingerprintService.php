<?php

namespace App\Services\Auth;

class DeviceFingerprintService
{
    public const MATCH_THRESHOLD = 80.0;

    public const CROSS_ACCOUNT_THRESHOLDS = [80, 95];

    private const MIN_COMPARABLE_WEIGHT = 45;

    /** @var array<string, int> */
    private const WEIGHTS = [
        'model' => 20,
        'platform' => 10,
        'architecture' => 8,
        'bitness' => 5,
        'screenResolution' => 18,
        'pixelRatio' => 7,
        'hardwareConcurrency' => 8,
        'deviceMemory' => 7,
        'maxTouchPoints' => 5,
        'colorDepth' => 3,
        'webglVendor' => 3,
        'webglRenderer' => 6,
    ];

    public function similarity(?array $stored, ?array $candidate): ?float
    {
        if (! $stored || ! $candidate) {
            return null;
        }

        $comparableWeight = 0;
        $matchedWeight = 0;

        foreach (self::WEIGHTS as $key => $weight) {
            $storedValue = $this->normalize($stored[$key] ?? null);
            $candidateValue = $this->normalize($candidate[$key] ?? null);

            if ($storedValue === null || $candidateValue === null) {
                continue;
            }

            $comparableWeight += $weight;
            if ($this->matches($key, $storedValue, $candidateValue)) {
                $matchedWeight += $weight;
            }
        }

        if ($comparableWeight < self::MIN_COMPARABLE_WEIGHT) {
            return null;
        }

        return round(($matchedWeight / $comparableWeight) * 100, 2);
    }

    /**
     * Indexed, coarse anchors are used only to shortlist possible matches.
     * The weighted similarity calculation remains the final decision.
     *
     * @return array<string, string|null>
     */
    public function lookupKeys(?array $fingerprint): array
    {
        $fingerprint ??= [];

        return [
            'fingerprint_model_key' => $this->hashParts([
                $fingerprint['platform'] ?? null,
                $fingerprint['model'] ?? null,
            ], 2),
            'fingerprint_screen_key' => $this->hashParts([
                $fingerprint['screenResolution'] ?? null,
            ], 1),
            'fingerprint_graphics_key' => $this->hashParts([
                $fingerprint['platform'] ?? null,
                $fingerprint['webglVendor'] ?? null,
                $fingerprint['webglRenderer'] ?? null,
            ], 2),
        ];
    }

    private function normalize(mixed $value): string|float|int|null
    {
        if (is_string($value)) {
            $normalized = strtolower(trim(preg_replace('/\s+/', ' ', $value) ?? $value));

            return $normalized === '' ? null : $normalized;
        }

        return is_int($value) || is_float($value) ? $value : null;
    }

    private function matches(string $key, string|float|int $stored, string|float|int $candidate): bool
    {
        if (in_array($key, ['pixelRatio', 'deviceMemory'], true)) {
            return abs((float) $stored - (float) $candidate) <= 0.15;
        }

        return $stored === $candidate;
    }

    private function hashParts(array $parts, int $minimumPresent): ?string
    {
        $normalized = array_map(fn ($value) => $this->normalize($value), $parts);
        $present = array_filter($normalized, fn ($value) => $value !== null);

        if (count($present) < $minimumPresent) {
            return null;
        }

        return hash('sha256', implode('|', array_map(
            fn ($value) => $value === null ? '-' : (string) $value,
            $normalized,
        )));
    }
}
