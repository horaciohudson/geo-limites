# 🏗️ ENTIDADES JAVA PARA CADASTRO DE TERRENOS

## 📋 Estrutura Necessária

### 1. **Entity: Terreno.java**
```java
@Entity
@Table(name = "tab_terrenos")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Terreno {
    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    @Column(name = "terreno_id")
    private UUID terrenoId;
    
    @Column(nullable = false)
    private String nome;
    
    @Column(name = "codigo_interno")
    private String codigoInterno;
    
    // PROPRIETÁRIO
    @Column(name = "proprietario_nome", nullable = false)
    private String proprietarioNome;
    
    @Column(name = "proprietario_cpf_cnpj")
    private String proprietarioCpfCnpj;
    
    // LOCALIZAÇÃO
    @Column(nullable = false)
    private String logradouro;
    
    private String numero;
    private String complemento;
    
    @Column(nullable = false)
    private String bairro;
    
    @Column(nullable = false)
    private String cidade;
    
    @Column(nullable = false, length = 2)
    private String estado;
    
    // DADOS CARTOGRÁFICOS
    @Column(name = "sistema_coordenadas")
    private String sistemaCoordenadas = "SIRGAS 2000 / UTM zone 23S";
    
    // RELACIONAMENTOS
    @OneToMany(mappedBy = "terreno", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    private List<TerrenoMarco> marcos = new ArrayList<>();
    
    @OneToMany(mappedBy = "terreno", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    private List<TerrenoConfrontacao> confrontacoes = new ArrayList<>();
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "owner_id", nullable = false)
    private User owner;
    
    // AUDITORIA
    @CreationTimestamp
    @Column(name = "created_at")
    private LocalDateTime createdAt;
    
    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
    
    @Builder.Default
    private Boolean active = true;
}
```

### 2. **DTO: TerrenoDTO.java**
```java
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TerrenoDTO {
    private UUID terrenoId;
    private String nome;
    private String codigoInterno;
    
    // PROPRIETÁRIO
    private String proprietarioNome;
    private String proprietarioCpfCnpj;
    private String proprietarioRg;
    private String proprietarioTelefone;
    private String proprietarioEmail;
    
    // LOCALIZAÇÃO
    private String logradouro;
    private String numero;
    private String complemento;
    private String bairro;
    private String cidade;
    private String estado;
    private String cep;
    
    // DADOS CARTOGRÁFICOS
    private String sistemaCoordenadas;
    private String datum;
    private String fusoUtm;
    private String meridianoCentral;
    
    // DADOS TÉCNICOS
    private BigDecimal areaTotal;
    private BigDecimal perimetroTotal;
    private BigDecimal testadaPrincipal;
    private BigDecimal profundidadeMedia;
    
    // DADOS LEGAIS
    private String matriculaRegistro;
    private String cartorioRegistro;
    private LocalDate dataRegistro;
    
    // CLASSIFICAÇÃO
    private String tipoTerreno;
    private String zonaUso;
    
    // CONFRONTAÇÕES
    private String confrontacaoNorte;
    private String confrontacaoSul;
    private String confrontacaoLeste;
    private String confrontacaoOeste;
    
    // OBSERVAÇÕES
    private String observacoes;
    private String restricoes;
    
    // RELACIONAMENTOS
    private List<TerrenoMarcoDTO> marcos;
    private List<TerrenoConfrontacaoDTO> confrontacoes;
    
    // AUDITORIA
    private UUID ownerId;
    private String ownerName;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private Boolean active;
}
```

### 3. **Controller: TerrenoController.java**
```java
@RestController
@RequestMapping("/api/terrenos")
@RequiredArgsConstructor
@Slf4j
@CrossOrigin(origins = "*")
public class TerrenoController {
    
    private final TerrenoService terrenoService;
    
    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'USER')")
    public ResponseEntity<List<TerrenoDTO>> listarTerrenos() {
        UUID userId = AuthUtils.getCurrentUserId();
        List<TerrenoDTO> terrenos = terrenoService.findByOwnerId(userId);
        return ResponseEntity.ok(terrenos);
    }
    
    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'USER')")
    public ResponseEntity<TerrenoDTO> buscarTerreno(@PathVariable UUID id) {
        UUID userId = AuthUtils.getCurrentUserId();
        TerrenoDTO terreno = terrenoService.findByIdAndOwnerId(id, userId);
        return ResponseEntity.ok(terreno);
    }
    
    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'USER')")
    public ResponseEntity<TerrenoDTO> criarTerreno(@RequestBody TerrenoDTO terrenoDTO) {
        UUID userId = AuthUtils.getCurrentUserId();
        TerrenoDTO novoTerreno = terrenoService.create(terrenoDTO, userId);
        return ResponseEntity.status(HttpStatus.CREATED).body(novoTerreno);
    }
    
    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'USER')")
    public ResponseEntity<TerrenoDTO> atualizarTerreno(
            @PathVariable UUID id, 
            @RequestBody TerrenoDTO terrenoDTO) {
        UUID userId = AuthUtils.getCurrentUserId();
        TerrenoDTO terrenoAtualizado = terrenoService.update(id, terrenoDTO, userId);
        return ResponseEntity.ok(terrenoAtualizado);
    }
    
    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'USER')")
    public ResponseEntity<Void> deletarTerreno(@PathVariable UUID id) {
        UUID userId = AuthUtils.getCurrentUserId();
        terrenoService.delete(id, userId);
        return ResponseEntity.noContent().build();
    }
}
```

### 4. **Service: TerrenoService.java**
```java
@Service
@RequiredArgsConstructor
@Slf4j
public class TerrenoService {
    
    private final TerrenoRepository terrenoRepository;
    private final TerrenoMapper terrenoMapper;
    
    public List<TerrenoDTO> findByOwnerId(UUID ownerId) {
        List<Terreno> terrenos = terrenoRepository.findByOwnerIdAndActiveTrue(ownerId);
        return terrenos.stream()
                .map(terrenoMapper::toDTO)
                .collect(Collectors.toList());
    }
    
    public TerrenoDTO findByIdAndOwnerId(UUID id, UUID ownerId) {
        Terreno terreno = terrenoRepository.findByTerrenoIdAndOwnerIdAndActiveTrue(id, ownerId)
                .orElseThrow(() -> new RuntimeException("Terreno não encontrado"));
        return terrenoMapper.toDTO(terreno);
    }
    
    public TerrenoDTO create(TerrenoDTO terrenoDTO, UUID ownerId) {
        Terreno terreno = terrenoMapper.toEntity(terrenoDTO);
        terreno.setOwner(User.builder().userId(ownerId).build());
        terreno.setActive(true);
        
        Terreno savedTerreno = terrenoRepository.save(terreno);
        return terrenoMapper.toDTO(savedTerreno);
    }
    
    public TerrenoDTO update(UUID id, TerrenoDTO terrenoDTO, UUID ownerId) {
        Terreno existingTerreno = terrenoRepository.findByTerrenoIdAndOwnerIdAndActiveTrue(id, ownerId)
                .orElseThrow(() -> new RuntimeException("Terreno não encontrado"));
        
        // Atualizar campos
        terrenoMapper.updateEntityFromDTO(terrenoDTO, existingTerreno);
        
        Terreno updatedTerreno = terrenoRepository.save(existingTerreno);
        return terrenoMapper.toDTO(updatedTerreno);
    }
    
    public void delete(UUID id, UUID ownerId) {
        Terreno terreno = terrenoRepository.findByTerrenoIdAndOwnerIdAndActiveTrue(id, ownerId)
                .orElseThrow(() -> new RuntimeException("Terreno não encontrado"));
        
        terreno.setActive(false);
        terrenoRepository.save(terreno);
    }
}
```

## 🎯 **Integração com Memorial**

### Modificar MemorialRequestDTO:
```java
public record MemorialRequestDTO(
        List<DxfParser.Entity> entities,
        String fileName,
        String projectName,
        String projectDescription,
        UUID standardId,
        UUID terrenoId  // ← NOVO CAMPO
) {}
```

### Usar dados do terreno no memorial:
```java
// No MemorialGptService
if (request.terrenoId() != null) {
    TerrenoDTO terreno = terrenoService.findByIdAndOwnerId(request.terrenoId(), userId);
    // Usar dados do terreno no prompt da IA
    prompt += "\n\nDADOS DO TERRENO:\n";
    prompt += "Proprietário: " + terreno.getProprietarioNome() + "\n";
    prompt += "Localização: " + terreno.getLogradouro() + ", " + terreno.getNumero() + "\n";
    prompt += "Bairro: " + terreno.getBairro() + ", " + terreno.getCidade() + "/" + terreno.getEstado() + "\n";
    // ... outros dados
}
```

## 📋 **Próximos Passos**

1. ✅ **SQL criado** - `src/main/resources/tables/terrenos.sql`
2. 🔄 **Criar entidades Java** conforme estrutura acima
3. 🔄 **Criar DTOs e mappers**
4. 🔄 **Criar repositories**
5. 🔄 **Criar services e controllers**
6. 🔄 **Integrar com geração de memorial**
7. 🔄 **Criar frontend para cadastro**
