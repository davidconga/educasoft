<?php
namespace App\Models\Tenant;
use Illuminate\Database\Eloquent\Model;

class FolhaProva extends Model {
    protected $connection = 'tenant';
    protected $table      = 'folhas_prova';
    protected $fillable   = ['codigo','disciplina','periodo','data_prova','classe','turma','professor','ano_letivo'];
}
